require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getConfiguredSenders, sendEmail } = require('./mailService');

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : null;

app.use(cors({
  origin(origin, callback) {
    if (!origin || !allowedOrigins || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/senders', (_req, res) => {
  const emails = getConfiguredSenders().map((sender) => sender.user);
  res.json({ senders: emails });
});

app.post('/api/send-email', async (req, res) => {
  const { sender, subject, message, bccList, targetEmail } = req.body || {};

  if (!sender || !subject || !message) {
    res.status(400).json({ success: false, error: 'sender, subject ve message alanlari zorunludur.' });
    return;
  }

  try {
    const result = await sendEmail({ sender, subject, message, bccList, targetEmail });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Mail Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = app;
