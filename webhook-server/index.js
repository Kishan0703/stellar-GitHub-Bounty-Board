require('dotenv').config();

const express = require('express');
const cors = require('cors');

const webhookRoutes = require('./routes/webhook');
const bountyRoutes = require('./routes/bounty');

const app = express();
const PORT = process.env.PORT || 4000;

// CORS — allow frontend to connect
app.use(cors());

// JSON body parser for all routes except webhook (which needs raw body)
app.use((req, res, next) => {
  if (req.path === '/webhook/github') {
    return next();
  }
  express.json()(req, res, next);
});

// Mount routes
app.use('/webhook', webhookRoutes);
app.use('/', bountyRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Bounty webhook server running on port ${PORT}`);
  console.log(`📡 Webhook endpoint: POST http://localhost:${PORT}/webhook/github`);
  console.log(`📋 Bounties API: http://localhost:${PORT}/bounties`);
});
