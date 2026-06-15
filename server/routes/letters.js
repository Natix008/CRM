const router = require('express').Router({ mergeParams: true });
const db = require('../db');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { id, disputeIds, type, addressedTo, creditorName, dateCreated, dateSent, content } = req.body;
    const letterId = id || `l${Date.now()}`;
    await db.query(
      `INSERT INTO letters (id, client_id, dispute_ids, type, addressed_to, creditor_name, date_created, date_sent, content)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [letterId, clientId, JSON.stringify(disputeIds || []), type, addressedTo,
        creditorName || null, dateCreated || null, dateSent || null, content || null]
    );
    res.status(201).json({ id: letterId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM letters WHERE client_id = ? ORDER BY date_created DESC', [req.params.clientId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
