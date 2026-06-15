const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

async function buildClient(row, pool) {
  const clientId = row.id;
  const [scores, accounts, disputes, letters, notes, tasks] = await Promise.all([
    pool.query('SELECT * FROM credit_scores WHERE client_id = ? ORDER BY date ASC', [clientId]),
    pool.query('SELECT * FROM accounts WHERE client_id = ?', [clientId]),
    pool.query('SELECT * FROM disputes WHERE client_id = ? ORDER BY date_updated DESC', [clientId]),
    pool.query('SELECT * FROM letters WHERE client_id = ? ORDER BY date_created DESC', [clientId]),
    pool.query('SELECT * FROM notes WHERE client_id = ? ORDER BY date ASC', [clientId]),
    pool.query('SELECT * FROM tasks WHERE client_id = ?', [clientId]),
  ]);

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    dateOfBirth: row.date_of_birth,
    ssnLast4: row.ssn_last4,
    enrollmentDate: row.enrollment_date,
    status: row.status,
    monthlyFee: parseFloat(row.monthly_fee),
    referralSource: row.referral_source,
    myScoreIQUsername: row.myscoreiq_username || undefined,
    myScoreIQPassword: row.myscoreiq_password || undefined,
    creditScores: scores[0].map(s => ({ bureau: s.bureau, score: s.score, date: s.date })),
    accounts: accounts[0].map(a => ({
      id: a.id,
      clientId: a.client_id,
      creditor: a.creditor,
      accountNumber: a.account_number,
      accountType: a.account_type,
      balance: parseFloat(a.balance),
      originalBalance: parseFloat(a.original_balance),
      dateOpened: a.date_opened,
      dateClosed: a.date_closed || undefined,
      status: a.status,
      bureaus: typeof a.bureaus === 'string' ? JSON.parse(a.bureaus) : (a.bureaus || []),
      notes: a.notes || undefined,
    })),
    disputes: disputes[0].map(d => ({
      id: d.id,
      clientId: d.client_id,
      accountId: d.account_id,
      bureau: d.bureau,
      reason: d.reason,
      status: d.status,
      round: d.round,
      dateOpened: d.date_opened,
      dateUpdated: d.date_updated,
      letterSent: !!d.letter_sent,
      letterDate: d.letter_date || undefined,
      result: d.result || undefined,
      notes: d.notes || undefined,
    })),
    letters: letters[0].map(l => ({
      id: l.id,
      clientId: l.client_id,
      disputeIds: typeof l.dispute_ids === 'string' ? JSON.parse(l.dispute_ids) : (l.dispute_ids || []),
      type: l.type,
      addressedTo: l.addressed_to,
      creditorName: l.creditor_name || undefined,
      dateCreated: l.date_created,
      dateSent: l.date_sent || undefined,
      content: l.content || undefined,
    })),
    notes: notes[0].map(n => ({
      id: n.id,
      clientId: n.client_id,
      content: n.content,
      date: n.date,
      author: n.author,
    })),
    tasks: tasks[0].map(t => ({
      id: t.id,
      clientId: t.client_id,
      title: t.title,
      description: t.description || undefined,
      priority: t.priority,
      status: t.status,
      dueDate: t.due_date,
      assignedTo: t.assigned_to,
    })),
  };
}

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM clients WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    const clients = await Promise.all(rows.map(row => buildClient(row, db)));
    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { id, firstName, lastName, email, phone, address, city, state, zip,
      dateOfBirth, ssnLast4, enrollmentDate, status, monthlyFee, referralSource,
      myScoreIQUsername, myScoreIQPassword } = req.body;
    const clientId = id || `c${Date.now()}`;
    await db.query(
      `INSERT INTO clients (id, user_id, first_name, last_name, email, phone, address, city, state, zip,
        date_of_birth, ssn_last4, enrollment_date, status, monthly_fee, referral_source,
        myscoreiq_username, myscoreiq_password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [clientId, req.user.id, firstName, lastName, email, phone, address, city, state, zip,
        dateOfBirth || null, ssnLast4, enrollmentDate, status || 'Active', monthlyFee || 99,
        referralSource || null, myScoreIQUsername || null, myScoreIQPassword || null]
    );
    const [rows] = await db.query('SELECT * FROM clients WHERE id = ?', [clientId]);
    const client = await buildClient(rows[0], db);
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, address, city, state, zip,
      dateOfBirth, ssnLast4, status, monthlyFee, referralSource,
      myScoreIQUsername, myScoreIQPassword } = req.body;
    await db.query(
      `UPDATE clients SET first_name=?, last_name=?, email=?, phone=?, address=?, city=?, state=?, zip=?,
        date_of_birth=?, ssn_last4=?, status=?, monthly_fee=?, referral_source=?,
        myscoreiq_username=?, myscoreiq_password=?
       WHERE id=? AND user_id=?`,
      [firstName, lastName, email, phone, address, city, state, zip,
        dateOfBirth || null, ssnLast4, status, monthlyFee, referralSource || null,
        myScoreIQUsername || null, myScoreIQPassword || null,
        req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM clients WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
