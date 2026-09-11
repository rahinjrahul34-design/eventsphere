const Notification = require('../models/Notification');
const { emitToUser } = require('../sockets');
const emailService = require('./emailService');

/**
 * Creates an in-app notification, pushes it in real time over Socket.IO,
 * and optionally sends an email (mock transport in demo mode).
 */
async function notify({
  user,
  type = 'system',
  title,
  message = '',
  link = '',
  data = {},
  email = null,
  emailed = false,
}) {
  if (!user) return null;
  const notification = await Notification.create({
    user,
    type,
    title,
    message,
    link,
    data,
    emailed,
  });

  emitToUser(user, 'notification:new', notification);

  if (email) {
    const result = await emailService.sendEmail({ to: email.to, ...email });
    if (result.delivered) notification.emailed = true;
  }
  return notification;
}

async function notifyMany(entries) {
  return Promise.all(entries.map((e) => notify(e)));
}

module.exports = { notify, notifyMany };
