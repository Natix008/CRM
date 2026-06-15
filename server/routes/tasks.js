const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM tasks WHERE user_id = ? AND client_id IS NULL ORDER BY due_date ASC',
      [req.user.id]
    );
    const tasks = rows.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description || undefined,
      priority: t.priority,
      status: t.status,
      dueDate: t.due_date,
      assignedTo: t.assigned_to,
    }));
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { id, clientId, title, description, priority, status, dueDate, assignedTo } = req.body;
    const taskId = id || `t${Date.now()}`;
    await db.query(
      `INSERT INTO tasks (id, client_id, user_id, title, description, priority, status, due_date, assigned_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [taskId, clientId || null, req.user.id, title, description || null,
        priority || 'Medium', status || 'Todo', dueDate || null, assignedTo || req.user.name]
    );
    res.status(201).json({ id: taskId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, priority, status, dueDate, assignedTo } = req.body;
    await db.query(
      `UPDATE tasks SET title=?, description=?, priority=?, status=?, due_date=?, assigned_to=? WHERE id=? AND user_id=?`,
      [title, description || null, priority, status, dueDate || null, assignedTo, req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
