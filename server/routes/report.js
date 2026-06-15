const router = require('express').Router({ mergeParams: true });
const db = require('../db');
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const os = require('os');

const REPORTS_DIR = path.join(os.tmpdir(), 'crm-reports');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

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

// GET /api/clients/:clientId/fetch-report/download — serve saved HTML report
router.get('/download', auth, async (req, res) => {
  try {
    const clientId = req.params.clientId;
    // Find most recent report for this client
    const files = fs.readdirSync(REPORTS_DIR)
      .filter(f => f.startsWith(`report-${clientId}-`) && f.endsWith('.html'))
      .sort()
      .reverse();
    if (!files.length) return res.status(404).json({ message: 'No report downloaded yet for this client.' });
    const filePath = path.join(REPORTS_DIR, files[0]);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="credit-report-${clientId}.html"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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
      return res.status(500).json({ message: 'Puppeteer not installed. Run: npm install puppeteer' });
    }

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1280, height: 900 });

      // ── Step 1: Load login page ───────────────────────────────────────────
      await page.goto('https://member.myscoreiq.com/Login.aspx', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));
      console.log('Login page URL:', page.url());

      // ── Step 2: Fill credentials ──────────────────────────────────────────
      const userSelectors = [
        '#Navbar1_txtUsername', 'input[name="Navbar1$txtUsername"]',
        '#txtUsername', 'input[name="txtUsername"]',
        'input[type="email"]', 'input[name="email"]', 'input[name="Email"]',
        'input[name="username"]', 'input[name="UserName"]',
        'input[placeholder*="email" i]', 'input[placeholder*="user" i]',
        'input[type="text"]',
      ];

      let userFilled = false;
      for (const sel of userSelectors) {
        try {
          const el = await page.$(sel);
          if (el) {
            await el.click({ clickCount: 3 });
            await page.keyboard.type(client.myscoreiq_username, { delay: 40 });
            const val = await el.evaluate(n => n.value);
            if (val) { console.log('Username filled via:', sel); userFilled = true; break; }
          }
        } catch { /* try next */ }
      }

      if (!userFilled) {
        // Direct JS fallback
        userFilled = await page.evaluate((u) => {
          const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"]'));
          for (const inp of inputs) {
            inp.value = u;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
          return false;
        }, client.myscoreiq_username);
        if (userFilled) console.log('Username filled via JS evaluate');
      }

      if (!userFilled) {
        await browser.close();
        return res.status(400).json({ message: 'Could not find the username field on the MyScoreIQ login page.' });
      }

      await new Promise(r => setTimeout(r, 400));

      let passFilled = false;
      for (const sel of ['#Navbar1_txtPassword', 'input[name="Navbar1$txtPassword"]', '#txtPassword', 'input[type="password"]']) {
        try {
          const el = await page.$(sel);
          if (el) {
            await el.click({ clickCount: 3 });
            await page.keyboard.type(client.myscoreiq_password, { delay: 40 });
            const val = await el.evaluate(n => n.value);
            if (val) { console.log('Password filled via:', sel); passFilled = true; break; }
          }
        } catch { /* try next */ }
      }

      if (!passFilled) {
        passFilled = await page.evaluate((p) => {
          const inp = document.querySelector('input[type="password"]');
          if (!inp) return false;
          inp.value = p;
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }, client.myscoreiq_password);
        if (passFilled) console.log('Password filled via JS evaluate');
      }

      if (!passFilled) {
        await browser.close();
        return res.status(400).json({ message: 'Could not find the password field on the MyScoreIQ login page.' });
      }

      await new Promise(r => setTimeout(r, 400));

      // ── Step 3: Submit ────────────────────────────────────────────────────
      const submitSelectors = [
        '#Navbar1_btnLogin', 'input[name="Navbar1$btnLogin"]',
        '#btnLogin', 'input[type="submit"]', 'button[type="submit"]',
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
            console.log('Submitted via:', sel);
            break;
          }
        } catch { /* try next */ }
      }

      if (!submitted) {
        await page.keyboard.press('Enter');
        await new Promise(r => setTimeout(r, 5000));
      } else {
        await new Promise(r => setTimeout(r, 3000));
      }

      const postLoginUrl = page.url();
      console.log('Post-login URL:', postLoginUrl);

      if (/Login\.aspx/i.test(postLoginUrl)) {
        const bodyText = await page.evaluate(() => document.body.innerText);
        const errMatch = bodyText.match(/(invalid|incorrect|wrong|failed|error|password)[^\n.]{0,100}/i);
        await browser.close();
        return res.status(401).json({
          message: errMatch ? `Login failed: ${errMatch[0].trim()}` : 'Login failed — username or password is incorrect.',
        });
      }

      // ── Step 4: Go to Credit Report page ─────────────────────────────────
      await page.goto('https://member.myscoreiq.com/CreditReport.aspx', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 4000));
      console.log('Credit report page:', page.url());

      // ── Step 5: Find the "Download this report" link ──────────────────────
      const downloadHref = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const dl = links.find(a => /download.*report|print.*report/i.test(a.textContent || '') || /download/i.test(a.textContent || ''));
        if (dl) return dl.href;
        // Fallback: look for links ending in common report patterns
        const fallback = links.find(a => /report/i.test(a.href) && a.href.includes('aspx'));
        return fallback ? fallback.href : null;
      });

      console.log('Download link found:', downloadHref);

      let reportHtml = '';
      let reportSourceUrl = '';

      if (downloadHref) {
        // Navigate to download URL — Puppeteer keeps the session
        await page.goto(downloadHref, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 3000));
        reportSourceUrl = page.url();
        reportHtml = await page.content();
        console.log('Download page URL:', reportSourceUrl, '| HTML length:', reportHtml.length);
      } else {
        // No download link found — use the current credit report page itself
        reportHtml = await page.content();
        reportSourceUrl = page.url();
        console.log('No download link found — using current page HTML, length:', reportHtml.length);
      }

      await browser.close();

      // ── Step 6: Save HTML to disk ─────────────────────────────────────────
      const fileName = `report-${client.id}-${Date.now()}.html`;
      const filePath = path.join(REPORTS_DIR, fileName);
      fs.writeFileSync(filePath, reportHtml, 'utf8');
      console.log('Report saved to:', filePath);

      // ── Step 7: Parse HTML for scores ─────────────────────────────────────
      const scores = parseScoresFromHtml(reportHtml);
      console.log('Scores extracted:', scores);

      // ── Step 8: Parse HTML for accounts ───────────────────────────────────
      const accounts = parseAccountsFromHtml(reportHtml);
      console.log('Accounts extracted:', accounts.length);

      res.json({
        clientId: client.id,
        fetchedAt: new Date().toISOString(),
        scores,
        accounts,
        negativeCount: accounts.filter(a => a.isNegative).length,
        reportFile: fileName,
        reportUrl: reportSourceUrl,
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

// ── HTML Parsing Helpers ───────────────────────────────────────────────────

function parseScoresFromHtml(html) {
  const scores = [];
  const bureaus = [
    { name: 'TransUnion', patterns: [/transunion/i] },
    { name: 'Experian',   patterns: [/experian/i] },
    { name: 'Equifax',    patterns: [/equifax/i] },
  ];

  // Strip tags for text scanning
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  for (const bureau of bureaus) {
    for (const pat of bureau.patterns) {
      const match = pat.exec(text);
      if (!match) continue;
      // Look for a 3-digit score (300-850) within 500 chars of the bureau name
      const slice = text.substring(Math.max(0, match.index - 300), match.index + 500);
      const scoreMatch = slice.match(/\b([3-8]\d{2})\b/);
      if (scoreMatch && !scores.find(s => s.bureau === bureau.name)) {
        scores.push({ bureau: bureau.name, score: parseInt(scoreMatch[1]) });
        break;
      }
    }
  }
  return scores;
}

function parseAccountsFromHtml(html) {
  const NEG_KW = ['collection', 'charge', 'late', 'past due', 'delinquent', 'repo', 'foreclos', 'bankrupt', 'charged off', 'settled'];
  const accounts = [];
  const seen = new Set();

  // Match <tr> blocks — Three Bureau report uses standard HTML tables
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;

  while ((trMatch = trRegex.exec(html)) !== null) {
    const rowHtml = trMatch[1];
    const rowText = rowHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (rowText.length < 8 || rowText.length > 3000) continue;

    // Extract <td> cells
    const cells = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch;
    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      const cellText = tdMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (cellText) cells.push(cellText);
    }

    if (cells.length < 2) continue;

    const creditor = cells[0];
    // Skip header rows and very short/long creditor names
    if (!creditor || creditor.length < 3 || creditor.length > 80) continue;
    if (/^(creditor|account|name|status|balance|bureau|type|date|open|close|payment|trans|exper|equi|three|bureau|credit|score|personal|inquiry|address|employment)/i.test(creditor)) continue;

    const dedupeKey = creditor.toLowerCase().replace(/\s+/g, '');
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const balMatch = rowText.match(/\$[\d,]+/);
    const balance = balMatch ? parseInt(balMatch[0].replace(/[$,]/g, '')) : 0;

    const acctMatch = rowText.match(/\b(\d{4,})\b/);
    const accountNumber = acctMatch ? `****${acctMatch[1].slice(-4)}` : '****0000';

    const statusCell = cells.find(c => NEG_KW.some(k => c.toLowerCase().includes(k)));
    const status = statusCell || cells[cells.length - 1] || 'Unknown';

    const isNeg = NEG_KW.some(k => rowText.toLowerCase().includes(k));
    const neg = isNeg || isNegative(status);

    // Determine which bureaus report this account
    const bureausReporting = [];
    if (/transunion/i.test(rowText) || cells.length >= 4) bureausReporting.push('TransUnion');
    if (/experian/i.test(rowText) || cells.length >= 4) bureausReporting.push('Experian');
    if (/equifax/i.test(rowText) || cells.length >= 4) bureausReporting.push('Equifax');
    if (!bureausReporting.length) bureausReporting.push('TransUnion', 'Experian', 'Equifax');

    accounts.push({
      creditor,
      accountNumber,
      accountType: 'Other',
      balance,
      status,
      bureaus: bureausReporting,
      isNegative: neg,
      negativeReason: neg ? detectNegativeReason(status) : undefined,
    });
  }

  return accounts;
}

module.exports = router;
