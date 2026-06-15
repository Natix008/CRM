const router = require('express').Router({ mergeParams: true });
const db = require('../db');
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const os = require('os');

const NEGATIVE_STATUSES = [
  'collection', 'charge-off', 'chargeoff', 'charged off', 'charge off',
  'late', 'delinquent', 'past due', 'repossession', 'repossessed',
  'foreclosure', 'foreclosed', 'bankruptcy', 'settled', 'judgment',
  '30 days', '60 days', '90 days', '120 days',
];

function isNegative(text = '') {
  return NEGATIVE_STATUSES.some(kw => text.toLowerCase().includes(kw));
}

function detectNegativeReason(text = '') {
  const s = text.toLowerCase();
  if (s.includes('collection')) return 'Collection';
  if (s.includes('charge')) return 'Charge-off';
  if (s.includes('late') || s.includes('past due') || s.includes('delinquent')) return 'Late Payment';
  if (s.includes('repo')) return 'Repossession';
  if (s.includes('foreclos')) return 'Foreclosure';
  if (s.includes('bankrupt')) return 'Bankruptcy';
  return 'Negative Item';
}

// Try to find and fill an input across the page and any iframes
async function fillInput(page, selectors, value) {
  // Try main page first
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.click({ clickCount: 3 });
        await page.keyboard.type(value, { delay: 40 });
        console.log(`Filled with selector: ${sel}`);
        return { success: true, context: 'main' };
      }
    } catch { /* try next */ }
  }

  // Try inside iframes
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    for (const sel of selectors) {
      try {
        const el = await frame.$(sel);
        if (el) {
          await el.click({ clickCount: 3 });
          await frame.type(sel, value, { delay: 40 });
          console.log(`Filled in iframe with selector: ${sel}`);
          return { success: true, context: 'iframe' };
        }
      } catch { /* try next */ }
    }
  }

  return { success: false };
}

async function clickSubmit(page) {
  const submitSelectors = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button[id*="login" i]',
    'button[id*="submit" i]',
    'button[id*="sign" i]',
    'a[id*="login" i]',
    '[class*="login-btn"]',
    '[class*="btn-login"]',
    '[class*="btn-primary"]',
    'button',
  ];

  for (const sel of submitSelectors) {
    try {
      const btn = await page.$(sel);
      if (btn) {
        const text = await btn.evaluate(el => el.textContent?.toLowerCase() || '');
        if (text.includes('login') || text.includes('sign in') || text.includes('submit') || text.includes('continue') || sel === 'button[type="submit"]' || sel === 'input[type="submit"]') {
          console.log(`Clicking submit: ${sel} ("${text.trim().slice(0, 30)}")`);
          await btn.click();
          return true;
        }
      }
    } catch { /* try next */ }
  }

  // Last resort: Enter key
  await page.keyboard.press('Enter');
  return true;
}

// POST /api/clients/:clientId/fetch-report
router.post('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, myscoreiq_username, myscoreiq_password, first_name, last_name FROM clients WHERE id = ? AND user_id = ?',
      [req.params.clientId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Client not found' });
    const client = rows[0];

    if (!client.myscoreiq_username || !client.myscoreiq_password) {
      return res.status(400).json({ message: 'MyScoreIQ credentials not set for this client' });
    }

    let puppeteer;
    try {
      puppeteer = require('puppeteer');
    } catch {
      return res.status(500).json({ message: 'Puppeteer not installed. Run: npm install puppeteer in the server folder.' });
    }

    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    const screenshotDir = path.join(os.tmpdir(), 'crm-screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);

    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1280, height: 900 });

      // Allow all requests
      await page.setRequestInterception(false);

      // ── Step 1: Try login URLs ───────────────────────────────────────────
      const loginUrls = [
        'https://www.myscoreiq.com/login',
        'https://www.myscoreiq.com/login.aspx',
        'https://www.myscoreiq.com/member/login',
        'https://secure.myscoreiq.com/login',
        'https://www.myscoreiq.com/sign-in',
      ];

      let loginLoaded = false;
      for (const url of loginUrls) {
        try {
          console.log('Trying login URL:', url);
          const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
          if (response && response.status() < 400) {
            await new Promise(r => setTimeout(r, 3000));
            loginLoaded = true;
            console.log('Login page loaded:', page.url());
            break;
          }
        } catch (e) {
          console.log('URL failed:', url, e.message);
        }
      }

      if (!loginLoaded) {
        await browser.close();
        return res.status(400).json({ message: 'Could not load MyScoreIQ login page. Check your internet connection.' });
      }

      // Screenshot for debugging
      const screenshotPath = path.join(screenshotDir, `login-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log('Screenshot saved:', screenshotPath);

      // Log all inputs found
      const allInputs = await page.evaluate(() =>
        Array.from(document.querySelectorAll('input')).map(i => ({
          type: i.type, name: i.name, id: i.id,
          placeholder: i.placeholder, autocomplete: i.autocomplete,
        }))
      );
      console.log('Inputs on page:', JSON.stringify(allInputs, null, 2));

      // Log iframes
      const frameUrls = page.frames().map(f => f.url());
      console.log('Frames:', frameUrls);

      // ── Step 2: Fill credentials ─────────────────────────────────────────
      const userSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[name="Email"]',
        'input[name="username"]',
        'input[name="UserName"]',
        'input[name="user_name"]',
        'input[id="email"]',
        'input[id="username"]',
        'input[id="Email"]',
        'input[id="UserName"]',
        'input[autocomplete="email"]',
        'input[autocomplete="username"]',
        'input[placeholder*="email" i]',
        'input[placeholder*="user" i]',
        'input[type="text"]',  // broadest fallback
      ];

      const userResult = await fillInput(page, userSelectors, client.myscoreiq_username);
      if (!userResult.success) {
        const screenshot64 = fs.readFileSync(screenshotPath).toString('base64');
        await browser.close();
        return res.status(400).json({
          message: 'Could not find the email/username input on the MyScoreIQ login page. The page structure may have changed.',
          debug: { inputs: allInputs, frames: frameUrls, screenshot: screenshot64 },
        });
      }

      await new Promise(r => setTimeout(r, 500));

      const passResult = await fillInput(page, ['input[type="password"]'], client.myscoreiq_password);
      if (!passResult.success) {
        await browser.close();
        return res.status(400).json({ message: 'Could not find password field on MyScoreIQ login page.' });
      }

      await new Promise(r => setTimeout(r, 500));

      // ── Step 3: Submit ───────────────────────────────────────────────────
      await Promise.allSettled([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 }),
        clickSubmit(page),
      ]);
      await new Promise(r => setTimeout(r, 3000));

      const postLoginUrl = page.url();
      console.log('Post-login URL:', postLoginUrl);

      // Still on login? Bad credentials.
      if (/login|signin|sign-in/i.test(postLoginUrl)) {
        const bodyText = await page.evaluate(() => document.body.innerText);
        const errMatch = bodyText.match(/(invalid|incorrect|wrong|failed|error)[^\n.]{0,100}/i);
        await browser.close();
        return res.status(401).json({
          message: errMatch
            ? `Login failed: ${errMatch[0].trim()}`
            : 'Login failed — username or password is incorrect.',
        });
      }

      // ── Step 4: Navigate to credit report ────────────────────────────────
      const reportUrls = [
        'https://www.myscoreiq.com/get-fico-score.aspx',
        'https://www.myscoreiq.com/credit-report.aspx',
        'https://www.myscoreiq.com/score-analysis.aspx',
        'https://www.myscoreiq.com/report',
        'https://www.myscoreiq.com/member/report',
        'https://www.myscoreiq.com/member/dashboard',
        'https://www.myscoreiq.com/dashboard',
      ];

      for (const url of reportUrls) {
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await new Promise(r => setTimeout(r, 3000));
          const len = await page.evaluate(() => document.body.innerText.length);
          if (len > 300 && !/login|signin/i.test(page.url())) {
            console.log('Report page found:', url, 'content length:', len);
            break;
          }
        } catch { /* try next */ }
      }

      const reportScreenshot = path.join(screenshotDir, `report-${Date.now()}.png`);
      await page.screenshot({ path: reportScreenshot, fullPage: true });
      console.log('Report screenshot:', reportScreenshot);

      // ── Step 5: Capture debug info ────────────────────────────────────────
      const debugInfo = await page.evaluate(() => {
        const bodyText = document.body.innerText || '';
        const bodyHtml = document.body.innerHTML || '';
        return {
          url: window.location.href,
          title: document.title,
          textLength: bodyText.length,
          textSample: bodyText.slice(0, 8000),
          htmlSample: bodyHtml.slice(0, 8000),
          allClasses: Array.from(document.querySelectorAll('[class]'))
            .map(el => el.className).filter(Boolean).slice(0, 100),
          iframes: Array.from(document.querySelectorAll('iframe')).map(f => f.src),
        };
      });
      console.log('Report page URL:', debugInfo.url);
      console.log('Report page title:', debugInfo.title);
      console.log('Report page text length:', debugInfo.textLength);
      console.log('Report page text (first 2000):', debugInfo.textSample.slice(0, 2000));

      // ── Step 6: Extract scores ────────────────────────────────────────────
      const scores = await page.evaluate(() => {
        const bureaus = ['Equifax', 'Experian', 'TransUnion'];
        const results = [];
        const bodyText = document.body.innerText;

        // Also try scanning the full HTML for scores near bureau names
        const bodyHtml = document.body.innerHTML;

        bureaus.forEach(bureau => {
          // Try innerText first
          let idx = bodyText.indexOf(bureau);
          if (idx !== -1) {
            const window = bodyText.substring(Math.max(0, idx - 200), idx + 500);
            const match = window.match(/\b([3-8]\d{2})\b/);
            if (match) { results.push({ bureau, score: parseInt(match[1]) }); return; }
          }
          // Try case-insensitive in HTML
          const re = new RegExp(bureau, 'i');
          const htmlIdx = bodyHtml.search(re);
          if (htmlIdx !== -1) {
            const snippet = bodyHtml.substring(Math.max(0, htmlIdx - 200), htmlIdx + 600)
              .replace(/<[^>]+>/g, ' ');
            const match = snippet.match(/\b([3-8]\d{2})\b/);
            if (match) results.push({ bureau, score: parseInt(match[1]) });
          }
        });
        return results;
      });

      // ── Step 7: Extract tradelines ────────────────────────────────────────
      const accounts = await page.evaluate(() => {
        const NEG = ['collection', 'charge', 'late', 'past due', 'delinquent', 'repo', 'foreclos', 'bankrupt'];
        const found = [];

        // Broader selector set
        const rows = Array.from(document.querySelectorAll(
          'tr, [class*="tradeline"], [class*="account-row"], [class*="trade-line"], ' +
          '[class*="account_row"], [class*="AccountRow"], [class*="TradeRow"], ' +
          '[class*="credit-item"], [class*="creditItem"]'
        ));
        rows.forEach(row => {
          const text = (row.innerText || '').trim();
          if (text.length < 10 || text.length > 2000) return;
          const cells = Array.from(row.querySelectorAll('td, th, [class*="cell"], [class*="col"], [class*="Col"]'));
          if (cells.length < 2) return;
          const creditor = cells[0]?.innerText?.trim();
          if (!creditor || creditor.length < 2) return;
          const balMatch = text.match(/\$[\d,]+/);
          const balance = balMatch ? parseInt(balMatch[0].replace(/[$,]/g, '')) : 0;
          const acctMatch = text.match(/\b\d{4,}\b/);
          const accountNumber = acctMatch ? `****${acctMatch[0].slice(-4)}` : '****0000';
          const status = cells.find(c => NEG.some(k => c.innerText?.toLowerCase().includes(k)))?.innerText?.trim() || cells[cells.length - 1]?.innerText?.trim() || '';
          const isNeg = NEG.some(k => text.toLowerCase().includes(k));
          found.push({ creditor, status, balance, accountNumber, isNeg });
        });
        return found;
      });

      await browser.close();

      const processedAccounts = accounts.map(a => {
        const neg = a.isNeg || isNegative(a.status);
        return {
          creditor: a.creditor,
          accountNumber: a.accountNumber,
          accountType: 'Other',
          balance: a.balance,
          status: a.status || 'Unknown',
          bureaus: ['Equifax', 'Experian', 'TransUnion'],
          isNegative: neg,
          negativeReason: neg ? detectNegativeReason(a.status) : undefined,
        };
      });

      res.json({
        clientId: client.id,
        fetchedAt: new Date().toISOString(),
        scores,
        accounts: processedAccounts,
        negativeCount: processedAccounts.filter(a => a.isNegative).length,
        debug: {
          reportUrl: debugInfo.url,
          pageTitle: debugInfo.title,
          textLength: debugInfo.textLength,
          textSample: debugInfo.textSample,
          htmlSample: debugInfo.htmlSample,
          classes: debugInfo.allClasses,
          iframes: debugInfo.iframes,
        },
      });

    } catch (err) {
      await browser.close();
      throw err;
    }
  } catch (err) {
    console.error('Report fetch error:', err.message);
    res.status(500).json({ message: `Failed to fetch report: ${err.message}` });
  }
});

module.exports = router;
