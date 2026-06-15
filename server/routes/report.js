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

      // ── Step 1: Load login page ──────────────────────────────────────────
      const LOGIN_URL = 'https://member.myscoreiq.com/Login.aspx';
      console.log('Loading login page:', LOGIN_URL);
      await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));

      const loginPageUrl = page.url();
      console.log('Login page loaded at:', loginPageUrl);

      // ── Step 2: Fill credentials using known ASP.NET field IDs ───────────
      // Primary selectors from actual page HTML
      const userSelectors = [
        '#Navbar1_txtUsername',
        'input[name="Navbar1$txtUsername"]',
        '#txtUsername',
        'input[name="txtUsername"]',
        'input[type="email"]',
        'input[name="email"]',
        'input[name="Email"]',
        'input[name="username"]',
        'input[name="UserName"]',
        'input[placeholder*="email" i]',
        'input[placeholder*="user" i]',
        'input[type="text"]',
      ];

      const passSelectors = [
        '#Navbar1_txtPassword',
        'input[name="Navbar1$txtPassword"]',
        '#txtPassword',
        'input[name="txtPassword"]',
        'input[type="password"]',
      ];

      let userFilled = false;
      for (const sel of userSelectors) {
        try {
          const el = await page.$(sel);
          if (el) {
            const visible = await el.evaluate(n => {
              const s = window.getComputedStyle(n);
              return s.display !== 'none' && s.visibility !== 'hidden' && n.offsetParent !== null;
            });
            if (!visible) continue;
            await el.click({ clickCount: 3 });
            await page.keyboard.type(client.myscoreiq_username, { delay: 40 });
            console.log('Filled username with:', sel);
            userFilled = true;
            break;
          }
        } catch { /* try next */ }
      }

      if (!userFilled) {
        await browser.close();
        return res.status(400).json({ message: 'Could not find the username field on the MyScoreIQ login page.' });
      }

      await new Promise(r => setTimeout(r, 400));

      let passFilled = false;
      for (const sel of passSelectors) {
        try {
          const el = await page.$(sel);
          if (el) {
            const visible = await el.evaluate(n => {
              const s = window.getComputedStyle(n);
              return s.display !== 'none' && s.visibility !== 'hidden' && n.offsetParent !== null;
            });
            if (!visible) continue;
            await el.click({ clickCount: 3 });
            await page.keyboard.type(client.myscoreiq_password, { delay: 40 });
            console.log('Filled password with:', sel);
            passFilled = true;
            break;
          }
        } catch { /* try next */ }
      }

      if (!passFilled) {
        await browser.close();
        return res.status(400).json({ message: 'Could not find the password field on the MyScoreIQ login page.' });
      }

      await new Promise(r => setTimeout(r, 400));

      // ── Step 3: Submit login ─────────────────────────────────────────────
      const submitSelectors = [
        '#Navbar1_btnLogin',
        'input[name="Navbar1$btnLogin"]',
        '#btnLogin',
        'input[type="submit"]',
        'button[type="submit"]',
        'a.button[href*="Login" i]',
        'a.button',
      ];

      let submitted = false;
      for (const sel of submitSelectors) {
        try {
          const el = await page.$(sel);
          if (el) {
            await Promise.allSettled([
              page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 }),
              el.click(),
            ]);
            submitted = true;
            console.log('Submitted with:', sel);
            break;
          }
        } catch { /* try next */ }
      }

      if (!submitted) {
        await page.keyboard.press('Enter');
        await new Promise(r => setTimeout(r, 5000));
      }

      await new Promise(r => setTimeout(r, 3000));

      const postLoginUrl = page.url();
      console.log('Post-login URL:', postLoginUrl);

      // Still on login? Bad credentials.
      if (/login/i.test(postLoginUrl)) {
        const bodyText = await page.evaluate(() => document.body.innerText);
        const errMatch = bodyText.match(/(invalid|incorrect|wrong|failed|error|password)[^\n.]{0,100}/i);
        await browser.close();
        return res.status(401).json({
          message: errMatch
            ? `Login failed: ${errMatch[0].trim()}`
            : 'Login failed — username or password is incorrect.',
        });
      }

      // ── Step 4: Navigate to Credit Report page ───────────────────────────
      const REPORT_URL = 'https://member.myscoreiq.com/CreditReport.aspx';
      console.log('Navigating to report:', REPORT_URL);
      await page.goto(REPORT_URL, { waitUntil: 'networkidle2', timeout: 40000 });
      await new Promise(r => setTimeout(r, 4000));

      const reportPageUrl = page.url();
      console.log('Report page URL:', reportPageUrl);

      // If redirected to login, session didn't stick
      if (/login/i.test(reportPageUrl)) {
        await browser.close();
        return res.status(401).json({ message: 'Session expired after login — credentials may be incorrect.' });
      }

      const screenshotPath = path.join(screenshotDir, `report-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log('Report screenshot saved:', screenshotPath);

      // ── Step 5: Extract credit scores ────────────────────────────────────
      const scores = await page.evaluate(() => {
        const bureaus = ['Equifax', 'Experian', 'TransUnion'];
        const results = [];
        const bodyText = document.body.innerText || '';
        const bodyHtml = document.body.innerHTML || '';

        bureaus.forEach(bureau => {
          // Search in visible text
          let idx = bodyText.indexOf(bureau);
          if (idx !== -1) {
            const slice = bodyText.substring(Math.max(0, idx - 300), idx + 600);
            const match = slice.match(/\b([3-8]\d{2})\b/);
            if (match) { results.push({ bureau, score: parseInt(match[1]) }); return; }
          }
          // Search in HTML (strips tags)
          const re = new RegExp(bureau, 'i');
          const htmlIdx = bodyHtml.search(re);
          if (htmlIdx !== -1) {
            const snippet = bodyHtml.substring(Math.max(0, htmlIdx - 300), htmlIdx + 800)
              .replace(/<[^>]+>/g, ' ');
            const match = snippet.match(/\b([3-8]\d{2})\b/);
            if (match) results.push({ bureau, score: parseInt(match[1]) });
          }
        });
        return results;
      });

      console.log('Scores found:', scores);

      // ── Step 6: Extract tradeline accounts ───────────────────────────────
      const accounts = await page.evaluate(() => {
        const NEG = ['collection', 'charge', 'late', 'past due', 'delinquent', 'repo', 'foreclos', 'bankrupt'];
        const found = [];

        const rows = Array.from(document.querySelectorAll(
          'tr, [class*="tradeline"], [class*="account-row"], [class*="trade-line"], ' +
          '[class*="account_row"], [class*="AccountRow"], [class*="TradeRow"], ' +
          '[class*="credit-item"], [class*="creditItem"], [class*="account-item"]'
        ));

        rows.forEach(row => {
          const text = (row.innerText || '').trim();
          if (text.length < 10 || text.length > 3000) return;
          const cells = Array.from(row.querySelectorAll('td, th, [class*="cell"], [class*="col"], [class*="Col"]'));
          if (cells.length < 2) return;
          const creditor = cells[0]?.innerText?.trim();
          if (!creditor || creditor.length < 2) return;
          const balMatch = text.match(/\$[\d,]+/);
          const balance = balMatch ? parseInt(balMatch[0].replace(/[$,]/g, '')) : 0;
          const acctMatch = text.match(/\b\d{4,}\b/);
          const accountNumber = acctMatch ? `****${acctMatch[0].slice(-4)}` : '****0000';
          const statusCell = cells.find(c => NEG.some(k => c.innerText?.toLowerCase().includes(k)));
          const status = statusCell?.innerText?.trim() || cells[cells.length - 1]?.innerText?.trim() || '';
          const isNeg = NEG.some(k => text.toLowerCase().includes(k));
          found.push({ creditor, status, balance, accountNumber, isNeg });
        });
        return found;
      });

      console.log('Accounts found:', accounts.length);

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

      // Include debug text sample to help tune parsing if needed
      const pageText = await page.evaluate(() => document.body.innerText).catch(() => '');

      res.json({
        clientId: client.id,
        fetchedAt: new Date().toISOString(),
        scores,
        accounts: processedAccounts,
        negativeCount: processedAccounts.filter(a => a.isNegative).length,
        debug: {
          reportUrl: reportPageUrl,
          textSample: pageText.slice(0, 5000),
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
