const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: (Number(SMTP_PORT) || 587) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
}

/**
 * Send an email. Gracefully no-ops if SMTP is not configured.
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML body
 */
async function sendEmail(to, subject, html) {
  const t = getTransporter();
  if (!t) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📧 Email skipped (no SMTP config): ${subject} → ${to}`);
    }
    return;
  }

  try {
    t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    }).catch(err => console.error('Email send async error:', err.message));
  } catch (err) {
    console.error('Email send setup error:', err.message);
  }
}

module.exports = { sendEmail };
