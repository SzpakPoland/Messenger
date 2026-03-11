const jwt = require('jsonwebtoken');
const User = require('../models/User');

const initializeSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.cookie
          ?.split(';')
          .find((c) => c.trim().startsWith('token='))
          ?.split('=')[1];

      if (!token) return next(new Error('Authentication error'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) return next(new Error('Authentication error'));

      socket.user = user;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id;
    console.log(`[Socket] Połączono: ${socket.user.username} (${socket.id})`);

    socket.join(`user_${userId}`);

    await User.findByIdAndUpdate(userId, { isOnline: true });
    socket.broadcast.emit('user_status', { userId, isOnline: true });

    socket.on('join_conversations', (conversationIds) => {
      if (!Array.isArray(conversationIds)) return;
      conversationIds.forEach((id) => {
        if (typeof id === 'string') socket.join(id);
      });
    });

    socket.on('leave_conversation', (conversationId) => {
      if (typeof conversationId === 'string') socket.leave(conversationId);
    });

    socket.on('typing', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(conversationId).emit('typing', {
        userId,
        username: socket.user.username,
        conversationId,
      });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(conversationId).emit('stop_typing', { userId, conversationId });
    });

    socket.on('disconnect', async () => {
      console.log(`[Socket] Rozłączono: ${socket.user.username}`);
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      socket.broadcast.emit('user_status', {
        userId,
        isOnline: false,
        lastSeen: new Date(),
      });
    });
  });
};

module.exports = initializeSocket;
