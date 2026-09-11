const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (config.email.host && config.email.user) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: { user: config.email.user, pass: config.email.pass },
    });
  } else {
    // DEMO: stream messages to the server console instead of sending them.
    transporter = nodemailer.createTransport({ streamTransport: true, newline: 'unix', buffer: true });
  }
  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  try {
    const info = await getTransporter().sendMail({
      from: config.email.from,
      to,
      subject,
      text: text || subject,
      html: html || `<p>${text || subject}</p>`,
    });
    if (!config.email.host) {
      console.log(`📧 [DEMO EMAIL] → ${to} | ${subject}`);
    }
    return { delivered: true, demo: !config.email.host, messageId: info.messageId };
  } catch (e) {
    console.error('Email send failed:', e.message);
    return { delivered: false, error: e.message };
  }
}

const templates = {
  registration: (name, eventTitle, code) => ({
    subject: `You're registered for ${eventTitle} — EventSphere`,
    html: `<h2>Hi ${name},</h2><p>Your registration for <b>${eventTitle}</b> is confirmed!</p>
      <p>Ticket code: <b>${code}</b>. Show it at the venue for check-in.</p>`,
  }),
  waitlistPromoted: (name, eventTitle) => ({
    subject: `A spot opened up for ${eventTitle}!`,
    html: `<h2>Hi ${name},</h2><p>You've been promoted from the waitlist for <b>${eventTitle}</b>. Your seat is reserved for 24 hours.</p>`,
  }),
  certificate: (name, eventTitle, id) => ({
    subject: `Your certificate for ${eventTitle} is ready`,
    html: `<h2>Congratulations ${name}!</h2><p>Your certificate <b>${id}</b> for <b>${eventTitle}</b> is ready to download.</p>`,
  }),
  resetPassword: (name, link) => ({
    subject: 'Reset your EventSphere password',
    html: `<p>Hi ${name}, reset your password using this link (valid 1 hour):</p><p><a href="${link}">${link}</a></p>`,
  }),
  announcement: (name, eventTitle, title, body) => ({
    subject: `[${eventTitle}] ${title}`,
    html: `<h2>${title}</h2><p>${body}</p>`,
  }),
};

module.exports = { sendEmail, templates };
