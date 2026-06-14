const { getConfiguredSenders } = require('../backend/mailService');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
    return;
  }

  const senders = getConfiguredSenders().map((sender) => sender.user);
  res.status(200).json({ senders });
};
