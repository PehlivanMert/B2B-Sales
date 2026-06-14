const { sendEmail } = require('../backend/mailService');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
    return;
  }

  const { sender, subject, message, bccList, targetEmail } = req.body || {};

  if (!sender || !subject || !message) {
    res.status(400).json({ success: false, error: 'sender, subject ve message alanlari zorunludur.' });
    return;
  }

  try {
    const result = await sendEmail({ sender, subject, message, bccList, targetEmail });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Mail Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
