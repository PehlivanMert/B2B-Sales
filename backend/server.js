require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// Set up Nodemailer transport.
async function getTransporter() {
  // If SMTP settings are provided in .env, use them
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Fallback to Ethereal test account if no .env config
  console.log("UYARI: .env dosyasında SMTP ayarları bulunamadı. Ethereal test hesabı kullanılıyor.");
  let testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, 
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

app.post('/api/send-email', async (req, res) => {
  const { sender, subject, message, bccList, targetEmail } = req.body;

  try {
    const transporter = await getTransporter();

    // Use bccList if provided (for bulk emails), otherwise fallback to targetEmail (for backward compatibility/testing)
    const bccAddresses = Array.isArray(bccList) && bccList.length > 0 ? bccList : [];
    const toAddress = bccAddresses.length > 0 ? undefined : (targetEmail || "pehlivanmert@outlook.com.tr");

    let info = await transporter.sendMail({
      from: `"${sender}" <${sender}>`, 
      to: toAddress, 
      bcc: bccAddresses.length > 0 ? bccAddresses : undefined,
      subject: subject, 
      text: message,
      html: message.replace(/\n/g, '<br>')
    });

    console.log("Message sent: %s", info.messageId);
    
    // Preview URL only available when using Ethereal
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log("Preview URL: %s", previewUrl);
    }

    res.json({ success: true, messageId: info.messageId, previewUrl });
  } catch (error) {
    console.error("Mail Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Email server running on http://localhost:${PORT}`);
});
