const nodemailer = require('nodemailer');
const { buildEmailHtml } = require('./emailTemplate');

function getConfiguredSenders() {
  const senders = [];

  for (let i = 1; i <= 10; i += 1) {
    const user = process.env[`SMTP_ACCOUNT_${i}_USER`];
    const pass = process.env[`SMTP_ACCOUNT_${i}_PASS`];
    if (user && pass) {
      senders.push({ user, pass });
    }
  }

  if (senders.length === 0 && process.env.SMTP_USER && process.env.SMTP_PASS) {
    senders.push({ user: process.env.SMTP_USER, pass: process.env.SMTP_PASS });
  }

  return senders;
}

async function getTransporter(senderEmail) {
  const senders = getConfiguredSenders();
  let account = senders.find((sender) => sender.user === senderEmail);

  if (!account && senders.length > 0) {
    account = senders[0];
  }

  if (account && process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: account.user,
        pass: account.pass,
      },
    });
  }

  console.log('UYARI: SMTP ayarlari bulunamadi. Ethereal test hesabi kullaniliyor.');
  const testAccount = await nodemailer.createTestAccount();

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

async function sendEmail({ sender, subject, message, bccList, targetEmail }) {
  const transporter = await getTransporter(sender);
  const bccAddresses = Array.isArray(bccList) && bccList.length > 0 ? bccList : [];
  const toAddress = bccAddresses.length > 0 ? undefined : (targetEmail || sender);

  const info = await transporter.sendMail({
    from: `"${sender}" <${sender}>`,
    to: toAddress,
    bcc: bccAddresses.length > 0 ? bccAddresses : undefined,
    subject,
    text: message,
    html: buildEmailHtml(subject, message, sender),
  });

  return {
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info) || null,
  };
}

module.exports = {
  getConfiguredSenders,
  sendEmail,
};
