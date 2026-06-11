const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// Set up Nodemailer transport.
// We use Ethereal as a default fake SMTP since we don't have real credentials.
// Ethereal will generate a URL to view the email.
async function getTransporter() {
  // If you want real emails to pehlivanmert@outlook.com.tr, uncomment below and add your Outlook credentials:
  /*
  return nodemailer.createTransport({
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "YOUR_EMAIL@outlook.com",
      pass: "YOUR_PASSWORD"
    }
  });
  */

  // Ethereal test account (Fallback for testing without credentials)
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
  const { sender, subject, message, recipientCount, targetEmail } = req.body;

  try {
    const transporter = await getTransporter();

    // Determine the 'to' address. For real mass email, it would be bcc or loop over recipients.
    // For this test, we just send one to the user's specific test address.
    const toAddress = targetEmail || "pehlivanmert@outlook.com.tr";

    let info = await transporter.sendMail({
      from: `"${sender}" <${sender}>`, 
      to: toAddress, 
      subject: subject, 
      text: `${message}\n\n---\nBu mail ${recipientCount} acenteye gönderilmiş gibi test edilmiştir.`,
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
