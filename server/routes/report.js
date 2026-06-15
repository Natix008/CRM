const router = require('express').Router({ mergeParams: true });
const db = require('../db');
const auth = require('../middleware/auth');

// Negative status keywords for detection
const NEGATIVE_STATUSES = [
  'collection', 'charge-off', 'chargeoff', 'charged off', 'charge off',
  'late', 'delinquent', 'past due', 'repossession', 'repossessed',
  'foreclosure', 'foreclosed', 'bankruptcy', 'settled', 'judgment',
  '30 days', '60 days', '90 days', '120 days',
];

function isNegative(status = '', paymentHistory = '') {
  const combined = (status + ' ' + paymentHistory).toLowerCase();
  return NEGATIVE_STATUSES.some(kw => combined.includes(kw));
}

function detectNegativeReason(status = '') {
  const s = status.toLowerCase();
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
    // Get client credentials from DB
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
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      await page.setViewport({ width: 1280, height: 800 });

      // Navigate to MyScoreIQ login
      await page.goto('https://www.myscoreiq.com/login', { waitUntil: 'networkidle2', timeout: 30000 });

      // Fill login form
      await page.waitForSelector('input[type="email"], input[name="email"], input[id*="email"], input[placeholder*="email" i]', { timeout: 10000 });
      await page.type('input[type="email"], input[name="email"], input[id*="email"], input[placeholder*="email" i]', client.myscoreiq_username, { delay: 50 });

      await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      await page.type('input[type="password"]', client.myscoreiq_password, { delay: 50 });

      // Submit login
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
        page.click('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign In")'),
      ]);

      // Check for login error
      const loginError = await page.$('.error, .alert-danger, [class*="error"]');
      if (loginError) {
        const errorText = await loginError.evaluate(el => el.textContent);
        await browser.close();
        return res.status(401).json({ message: `Login failed: ${errorText.trim()}` });
      }

      // Navigate to credit report / scores page
      await page.goto('https://www.myscoreiq.com/credit-report', { waitUntil: 'networkidle2', timeout: 30000 })
        .catch(() => page.goto('https://www.myscoreiq.com/dashboard', { waitUntil: 'networkidle2', timeout: 30000 }));

      // Wait for report content
      await page.waitForTimeout(3000);

      // Extract credit scores
      const scores = await page.evaluate(() => {
        const bureaus = ['Equifax', 'Experian', 'TransUnion'];
        const results = [];

        bureaus.forEach(bureau => {
          // Look for score near bureau name
          const elements = Array.from(document.querySelectorAll('*'));
          for (const el of elements) {
            if (el.children.length === 0 && el.textContent.includes(bureau)) {
              const parent = el.closest('[class*="score"], [class*="bureau"], [class*="card"], .score-container, section') || el.parentElement;
              if (parent) {
                const scoreMatch = parent.textContent.match(/\b([4-8]\d{2})\b/);
                if (scoreMatch) {
                  results.push({ bureau, score: parseInt(scoreMatch[1]) });
                  break;
                }
              }
            }
          }
        });

        // Fallback: look for any 3-digit scores 300-850 near bureau names
        if (results.length === 0) {
          const text = document.body.innerText;
          bureaus.forEach(bureau => {
            const idx = text.indexOf(bureau);
            if (idx !== -1) {
              const nearby = text.substring(idx, idx + 200);
              const match = nearby.match(/\b([3-8]\d{2})\b/);
              if (match) results.push({ bureau, score: parseInt(match[1]) });
            }
          });
        }

        return results;
      });

      // Extract tradelines / accounts
      const accounts = await page.evaluate(() => {
        const NEGATIVE_KEYWORDS = ['collection', 'charge', 'late', 'past due', 'delinquent', 'repossess', 'foreclos', 'bankrupt', '30', '60', '90', '120'];

        const rows = Array.from(document.querySelectorAll(
          'tr, [class*="tradeline"], [class*="account"], [class*="trade-line"], [class*="account-item"]'
        ));

        const found = [];
        for (const row of rows) {
          const text = row.textContent || '';
          if (text.length < 20 || text.length > 2000) continue;

          const creditorEl = row.querySelector('[class*="creditor"], [class*="name"], td:first-child');
          const creditor = creditorEl ? creditorEl.textContent.trim() : '';

          const statusEl = row.querySelector('[class*="status"], [class*="condition"]');
          const status = statusEl ? statusEl.textContent.trim() : '';

          const balanceMatch = text.match(/\$[\d,]+/);
          const balance = balanceMatch ? parseInt(balanceMatch[0].replace(/[$,]/g, '')) : 0;

          const acctMatch = text.match(/\b\d{4,}\b/);
          const accountNumber = acctMatch ? `****${acctMatch[0].slice(-4)}` : '****0000';

          if (!creditor || creditor.length < 2) continue;

          const isNeg = NEGATIVE_KEYWORDS.some(kw => (status + ' ' + text).toLowerCase().includes(kw));

          found.push({ creditor, status, balance, accountNumber, isNeg, rawText: text.substring(0, 300) });
        }
        return found;
      });

      await browser.close();

      // Process accounts into clean structure
      const processedAccounts = accounts.map(a => {
        const neg = isNegative(a.status, a.rawText);
        return {
          creditor: a.creditor,
          accountNumber: a.accountNumber,
          accountType: 'Other',
          balance: a.balance,
          status: a.status || 'Unknown',
          bureaus: ['Equifax', 'Experian', 'TransUnion'],
          isNegative: neg,
          negativeReason: neg ? detectNegativeReason(a.status || a.rawText) : undefined,
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
