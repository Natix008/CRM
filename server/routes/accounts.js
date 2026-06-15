const router = require('express').Router({ mergeParams: true });
const db = require('../db');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { id, creditor, accountNumber, accountType, balance, originalBalance,
      dateOpened, dateClosed, status, bureaus, notes } = req.body;
    const accountId = id || `a${Date.now()}`;
    await db.query(
      `INSERT INTO accounts (id, client_id, creditor, account_number, account_type, balance, original_balance,
        date_opened, date_closed, status, bureaus, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [accountId, clientId, creditor, accountNumber, accountType, balance || 0, originalBalance || 0,
        dateOpened || null, dateClosed || null, status, JSON.stringify(bureaus || []), notes || null]
    );
    res.status(201).json({ id: accountId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { creditor, accountNumber, accountType, balance, originalBalance,
      dateOpened, dateClosed, status, bureaus, notes } = req.body;
    await db.query(
      `UPDATE accounts SET creditor=?, account_number=?, account_type=?, balance=?, original_balance=?,
        date_opened=?, date_closed=?, status=?, bureaus=?, notes=? WHERE id=?`,
      [creditor, accountNumber, accountType, balance, originalBalance,
        dateOpened || null, dateClosed || null, status, JSON.stringify(bureaus || []), notes || null,
        req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
