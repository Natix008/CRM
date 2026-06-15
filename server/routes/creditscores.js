const router = require('express').Router({ mergeParams: true });
const db = require('../db');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { bureau, score, date } = req.body;
    const [result] = await db.query(
      'INSERT INTO credit_scores (client_id, bureau, score, date) VALUES (?, ?, ?, ?)',
      [clientId, bureau, score, date || new Date()]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
