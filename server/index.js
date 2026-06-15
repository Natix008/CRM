require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/clients/:clientId/accounts', require('./routes/accounts'));
app.use('/api/clients/:clientId/disputes', require('./routes/disputes'));
app.use('/api/clients/:clientId/letters', require('./routes/letters'));
app.use('/api/clients/:clientId/notes', require('./routes/notes'));
app.use('/api/clients/:clientId/scores', require('./routes/creditscores'));
app.use('/api/clients/:clientId/fetch-report', require('./routes/report'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/disputes', require('./routes/disputes'));
app.use('/api/tasks', require('./routes/tasks'));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`CreditPro API running on port ${PORT}`));
