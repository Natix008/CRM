const router = require('express').Router({ mergeParams: true });
const db = require('../db');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { id, content, date, author } = req.body;
    const noteId = id || `n${Date.now()}`;
    await db.query(
      'INSERT INTO notes (id, client_id, content, date, author) VALUES (?, ?, ?, ?, ?)',
      [noteId, clientId, content, date || new Date(), author || 'Agent']
    );
    res.status(201).json({ id: noteId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
