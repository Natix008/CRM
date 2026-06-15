const router = require('express').Router({ mergeParams: true });
const db = require('../db');
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

const NEGATIVE_STATUSES = [
  'collection', 'charge-off', 'chargeoff', 'charged off', 'charge off',
  'late', 'delinquent', 'past due', 'repossession', 'repossessed',
  'foreclosure', 'foreclosed', 'bankruptcy', 'settled', 'judgment',
  '30 days', '60 days', '90 days', '120 days',
];

function isNegative(status = '', extra = '') {
  const combined = (status + ' ' + extra).toLowerCase();
  return NEGATIVE_STATUSES.some(kw => combined.includes(kw));
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

// Find first matching input on page using multiple strategies
async function findAndFill(page, strategies, value) {
  for (const selector of strategies) {
    try {
      const el = await page.$(selector);
      if (el) {
        await el.click({ clickCount: 3 });
        await el.type(value, { delay: 40 });
        return true;
      }
    } catch { /* try next */ }
  }
  return false;
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
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      await page.setViewport({ width: 1280, height: 900 });

      // ── Step 1: Load login page ──────────────────────────────────────────
      const loginUrl = 'https://www.myscoreiq.com/login.aspx';
      await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await new Promise(r => setTimeout(r, 2000));

      // Dump all input fields so we can see what's on the page
      const inputInfo = await page.evaluate(() =>
        Array.from(document.querySelectorAll('input')).map(i => ({
          type: i.type, name: i.name, id: i.id,
          placeholder: i.placeholder, className: i.className.slice(0, 60),
        }))
      );
      console.log('Login page inputs:', JSON.stringify(inputInfo));

      // ── Step 2: Fill username ────────────────────────────────────────────
      const userStrategies = [
        'input[type="email"]',
        'input[name="email"]',
        'input[name="username"]',
        'input[name="Email"]',
        'input[name="UserName"]',
        'input[id*="email" i]',
        'input[id*="user" i]',
        'input[id*="login" i]',
        'input[placeholder*="email" i]',
        'input[placeholder*="user" i]',
        'input:not([type="password"]):not([type="hidden"]):not([type="submit"]):not([type="checkbox"])',
      ];
      const filledUser = await findAndFill(page, userStrategies, client.myscoreiq_username);
      if (!filledUser) {
        await browser.close();
        return res.status(400).json({ message: 'Could not find username/email field on MyScoreIQ login page. The site may have changed.' });
      }

      // ── Step 3: Fill password ────────────────────────────────────────────
      const filledPass = await findAndFill(page, ['input[type="password"]'], client.myscoreiq_password);
      if (!filledPass) {
        await browser.close();
        return res.status(400).json({ message: 'Could not find password field on MyScoreIQ login page.' });
      }

      // ── Step 4: Submit ───────────────────────────────────────────────────
      const submitStrategies = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button[id*="login" i]',
        'button[id*="submit" i]',
        'a[id*="login" i]',
        '[class*="login-btn"]',
        '[class*="btn-login"]',
        '[class*="submit"]',
      ];

      let submitted = false;
      for (const sel of submitStrategies) {
        try {
          const btn = await page.$(sel);
          if (btn) {
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
              btn.click(),
            ]);
            submitted = true;
            break;
          }
        } catch { /* try next */ }
      }

      if (!submitted) {
        // Try pressing Enter as last resort
        try {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
            page.keyboard.press('Enter'),
          ]);
          submitted = true;
        } catch { /* ignore */ }
      }

      await new Promise(r => setTimeout(r, 2000));

      // Check current URL — if still on login page, credentials are wrong
      const currentUrl = page.url();
      console.log('Post-login URL:', currentUrl);
      if (currentUrl.includes('login') || currentUrl.includes('signin')) {
        const pageText = await page.evaluate(() => document.body.innerText);
        const errMatch = pageText.match(/(invalid|incorrect|wrong|failed|error)[^\n.]{0,80}/i);
        await browser.close();
        return res.status(401).json({
          message: errMatch
            ? `Login failed: ${errMatch[0].trim()}`
            : 'Login failed — check MyScoreIQ username and password.',
        });
      }

      // ── Step 5: Navigate to credit report ────────────────────────────────
      const reportUrls = [
        'https://www.myscoreiq.com/get-fico-score.aspx',
        'https://www.myscoreiq.com/credit-report.aspx',
        'https://www.myscoreiq.com/score-analysis.aspx',
        'https://www.myscoreiq.com/member/dashboard',
      ];

      let reportLoaded = false;
      for (const url of reportUrls) {
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await new Promise(r => setTimeout(r, 3000));
          const bodyText = await page.evaluate(() => document.body.innerText);
          if (bodyText.length > 500 && !page.url().includes('login')) {
            reportLoaded = true;
            break;
          }
        } catch { /* try next */ }
      }

      if (!reportLoaded) {
        // Stay on dashboard/wherever we landed after login
        await new Promise(r => setTimeout(r, 2000));
      }

      const pageContent = await page.evaluate(() => document.body.innerText);
      console.log('Report page length:', pageContent.length, 'chars');

      // ── Step 6: Extract scores ────────────────────────────────────────────
      const scores = await page.evaluate(() => {
        const bureaus = ['Equifax', 'Experian', 'TransUnion'];
        const results = [];
        const bodyText = document.body.innerText;

        bureaus.forEach(bureau => {
          const idx = bodyText.indexOf(bureau);
          if (idx === -1) return;
          // Search up to 300 chars before and after the bureau name
          const window = bodyText.substring(Math.max(0, idx - 100), idx + 300);
          const match = window.match(/\b([3-8]\d{2})\b/);
          if (match) results.push({ bureau, score: parseInt(match[1]) });
        });

        return results;
      });

      // ── Step 7: Extract tradelines ────────────────────────────────────────
      const accounts = await page.evaluate(() => {
        const NEG = ['collection', 'charge', 'late', 'past due', 'delinquent', 'repo', 'foreclos', 'bankrupt', '30', '60', '90', '120'];
        const found = [];

        // Try table rows first
        const rows = Array.from(document.querySelectorAll('tr'));
        rows.forEach(row => {
          const text = row.innerText || '';
          if (text.length < 15 || text.length > 1500) return;
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length < 2) return;
          const creditor = cells[0]?.innerText?.trim();
          if (!creditor || creditor.length < 3) return;
          const rowText = text.toLowerCase();
          const status = cells.find(c => NEG.some(k => c.innerText?.toLowerCase().includes(k)))?.innerText?.trim() || '';
          const balMatch = text.match(/\$[\d,]+/);
          const balance = balMatch ? parseInt(balMatch[0].replace(/[$,]/g, '')) : 0;
          const acctMatch = text.match(/\b\d{4,}\b/);
          const accountNumber = acctMatch ? `****${acctMatch[0].slice(-4)}` : '****0000';
          const isNeg = NEG.some(k => rowText.includes(k));
          found.push({ creditor, status, balance, accountNumber, isNeg, raw: text.substring(0, 200) });
        });

        // Fallback: scan page text for creditor patterns
        if (found.length === 0) {
          const allText = document.body.innerText;
          const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 5);
          lines.forEach((line, i) => {
            const isNeg = NEG.some(k => line.toLowerCase().includes(k));
            const balMatch = line.match(/\$[\d,]+/);
            if (balMatch && i > 0) {
              found.push({
                creditor: lines[i - 1] || line,
                status: line,
                balance: parseInt(balMatch[0].replace(/[$,]/g, '')),
                accountNumber: '****0000',
                isNeg,
                raw: line,
              });
            }
          });
        }

        return found;
      });

      await browser.close();

      const processedAccounts = accounts.map(a => {
        const neg = a.isNeg || isNegative(a.status, a.raw);
        return {
          creditor: a.creditor,
          accountNumber: a.accountNumber,
          accountType: 'Other',
          balance: a.balance,
          status: a.status || 'Unknown',
          bureaus: ['Equifax', 'Experian', 'TransUnion'],
          isNegative: neg,
          negativeReason: neg ? detectNegativeReason(a.status || a.raw) : undefined,
        };
      });

      const report = {
        clientId: client.id,
        fetchedAt: new Date().toISOString(),
        scores,
        accounts: processedAccounts,
        negativeCount: processedAccounts.filter(a => a.isNegative).length,
      };

      res.json(report);
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
