const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const Message = require('../models/Message');

let io = null;

// Room helpers — every user joins their own room; every event has a room.
const userRoom = (userId) => `user:${userId}`;
const eventRoom = (eventId) => `event:${eventId}`;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        // Allow same-origin (no Origin), localhost dev, and *.e2b.app previews.
        if (!origin || /(^https?:\/\/localhost(:\d+)?$)|(\.e2b\.app$)/.test(origin)) return cb(null, true);
        return cb(null, origin === config.clientUrl);
      },
      credentials: true,
    },
  });

  // JWT auth handshake
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (token) {
        const decoded = jwt.verify(token, config.jwtSecret);
        const user = await User.findById(decoded.id).select('name role');
        if (user) {
          socket.user = { id: user._id.toString(), name: user.name, role: user.role };
        }
      }
      next();
    } catch (e) {
      next(); // anonymous spectators allowed
    }
  });

  io.on('connection', (socket) => {
    if (socket.user) {
      socket.join(userRoom(socket.user.id));
      socket.emit('connected', { ok: true });
    }

    socket.on('event:subscribe', (eventId) => {
      if (eventId) socket.join(eventRoom(eventId));
    });
    socket.on('event:unsubscribe', (eventId) => {
      if (eventId) socket.leave(eventRoom(eventId));
    });

    // Live chat with persistence
    socket.on('chat:message', async ({ eventId, text }, ack) => {
      if (!socket.user || !eventId || !text?.trim()) {
        return ack?.({ ok: false, error: 'Login required to chat' });
      }
      const message = await Message.create({
        kind: 'event',
        event: eventId,
        sender: socket.user.id,
        senderName: socket.user.name,
        text: String(text).slice(0, 1200),
      });
      const payload = {
        _id: message._id,
        event: eventId,
        sender: socket.user.id,
        senderName: socket.user.name,
        text: message.text,
        createdAt: message.createdAt,
      };
      io.to(eventRoom(eventId)).emit('chat:message', payload);
      ack?.({ ok: true, message: payload });
    });

    // Typing indicators (ephemeral)
    socket.on('chat:typing', ({ eventId }) => {
      if (socket.user && eventId) {
        socket.to(eventRoom(eventId)).emit('chat:typing', { name: socket.user.name });
      }
    });
  });

  return io;
}

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

// Emit helpers (safe no-ops before socket init, e.g. in tests)
const emitToUser = (userId, event, payload) => {
  if (io && userId) io.to(userRoom(userId)).emit(event, payload);
};
const emitToEvent = (eventId, event, payload) => {
  if (io && eventId) io.to(eventRoom(eventId)).emit(event, payload);
};

module.exports = { initSocket, getIO, emitToUser, emitToEvent, userRoom, eventRoom };
