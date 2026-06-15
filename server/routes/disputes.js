const router = require('express').Router({ mergeParams: true });
const db = require('../db');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { id, accountId, bureau, reason, status, round, dateOpened, dateUpdated,
      letterSent, letterDate, result, notes } = req.body;
    const disputeId = id || `d${Date.now()}`;
    await db.query(
      `INSERT INTO disputes (id, client_id, account_id, bureau, reason, status, round,
        date_opened, date_updated, letter_sent, letter_date, result, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [disputeId, clientId, accountId || null, bureau, reason, status || 'Pending', round || 1,
        dateOpened || null, dateUpdated || null, letterSent ? 1 : 0,
        letterDate || null, result || null, notes || null]
    );
    res.status(201).json({ id: disputeId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { accountId, bureau, reason, status, round, dateOpened, dateUpdated,
      letterSent, letterDate, result, notes } = req.body;
    await db.query(
      `UPDATE disputes SET account_id=?, bureau=?, reason=?, status=?, round=?,
        date_opened=?, date_updated=?, letter_sent=?, letter_date=?, result=?, notes=?
       WHERE id=?`,
      [accountId || null, bureau, reason, status, round,
        dateOpened || null, dateUpdated || null, letterSent ? 1 : 0,
        letterDate || null, result || null, notes || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
