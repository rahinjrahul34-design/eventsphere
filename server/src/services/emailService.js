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
    // In test environment, skip external network transport
    if (process.env.NODE_ENV === 'test') {
      return { delivered: true, test: true };
    }

    // 1. Resend API provider (if RESEND_API_KEY is configured)
    if (config.email.resendApiKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.email.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: config.email.from,
          to: [to],
          subject,
          text: text || subject,
          html: html || `<p>${text || subject}</p>`,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Resend API returned status ${res.status}`);
      }

      const data = await res.json().catch(() => ({}));
      return { delivered: true, provider: 'resend', messageId: data.id };
    }

    // 2. Nodemailer SMTP provider (or console stream in demo mode)
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
    // Safe security logging without secrets or user passwords
    console.error('Email delivery error (handled safely):', e.message);
    return { delivered: false, error: e.message };
  }
}

const templates = {
  passwordResetOtp: (name, otp, expiryMinutes = 10) => ({
    subject: 'Your password reset verification code',
    text: `Your verification code is:\n\n${otp}\n\nThis code expires in ${expiryMinutes} minutes.\n\nIf you did not request a password reset, you can safely ignore this email.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="margin-bottom: 24px;">
          <h1 style="color: #4f46e5; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">EventSphere</h1>
        </div>
        <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Hi ${name || 'there'},</p>
        <p style="font-size: 15px; color: #475569; line-height: 1.6;">
          You requested to reset your password. Use the verification code below to proceed:
        </p>
        <div style="background-color: #f8fafc; border: 1px dashed #6366f1; border-radius: 10px; padding: 20px; text-align: center; margin: 28px 0;">
          <p style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; margin: 0 0 8px 0;">Verification Code</p>
          <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #312e81; font-family: monospace;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          Your verification code is: <strong>${otp}</strong><br />
          This code expires in <strong>${expiryMinutes} minutes</strong>.
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0;">
          If you did not request a password reset, you can safely ignore this email. Your account remains secure and your password will not be changed.
        </p>
      </div>
    `,
  }),
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
  smartQueueSeatHeld: (name, eventTitle, expiresAt, minutes = 15, acceptUrl = '') => ({
    subject: `⚡ Seat Reserved: Action Required for ${eventTitle}!`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #4f46e5; margin-top: 0;">A seat just opened up for you!</h2>
        <p>Hi ${name || 'there'},</p>
        <p>A seat has become available for <b>${eventTitle}</b> and is temporarily reserved in your name.</p>
        <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #475569;">
            ⏰ <b>Hold Window:</b> ${minutes} minutes<br />
            Expires at: <b>${new Date(expiresAt).toLocaleTimeString()}</b>
          </p>
        </div>
        <p>Claim your seat before the reservation expires and is passed to the next attendee in line.</p>
        ${acceptUrl ? `<p><a href="${acceptUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Claim Your Seat Now</a></p>` : ''}
      </div>
    `,
  }),
  smartQueueSeatExpired: (name, eventTitle) => ({
    subject: `Seat Hold Expired: ${eventTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #64748b; margin-top: 0;">Seat Reservation Expired</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Your temporary seat hold for <b>${eventTitle}</b> has expired, and the seat was offered to the next person on the waitlist.</p>
        <p>You can rejoin the waitlist at any time on EventSphere.</p>
      </div>
    `,
  }),
  smartQueueReminder: (name, eventTitle, minutesRemaining, acceptUrl = '') => ({
    subject: `⏳ Hurry! Only ${minutesRemaining}m left to claim your seat for ${eventTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #ea580c; margin-top: 0;">Reservation Expiring Soon!</h2>
        <p>Hi ${name || 'there'},</p>
        <p>You only have <b>${minutesRemaining} minutes remaining</b> to claim your reserved seat for <b>${eventTitle}</b>.</p>
        ${acceptUrl ? `<p><a href="${acceptUrl}" style="display: inline-block; background: #ea580c; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Confirm Now</a></p>` : ''}
      </div>
    `,
  }),
};

module.exports = { sendEmail, templates };
