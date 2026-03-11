const express = require('express');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { avatarUpload, messageFileUpload } = require('../middleware/upload');

const router = express.Router();

const populateConversation = (query) =>
  query
    .populate('participants', '-password')
    .populate('admins', '-password')
    .populate({
      path: 'lastMessage',
      populate: { path: 'sender', select: 'username avatar' },
    });

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const query = Conversation.find({ participants: req.user._id }).sort({ updatedAt: -1 });
    const conversations = await populateConversation(query);
    res.json({ conversations });
  } catch (error) {
    next(error);
  }
});

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ message: 'ID odbiorcy jest wymagane' });
    }
    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Nie możesz pisać do siebie' });
    }

    const recipient = await User.findById(recipientId).select('-password');
    if (!recipient) {
      return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
    }

    let conversation = await Conversation.findOne({
      type: 'private',
      participants: { $all: [req.user._id, recipientId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'private',
        participants: [req.user._id, recipientId],
      });
    }

    const populated = await populateConversation(Conversation.findById(conversation._id));
    res.status(200).json({ conversation: populated });
  } catch (error) {
    next(error);
  }
});

router.post('/group', authMiddleware, avatarUpload.single('avatar'), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    let memberIds = [];

    try {
      memberIds = req.body.memberIds ? JSON.parse(req.body.memberIds) : [];
    } catch {
      memberIds = [];
    }

    if (!name || name.trim().length < 1) {
      return res.status(400).json({ message: 'Nazwa grupy jest wymagana' });
    }

    const participants = [req.user._id.toString()];
    if (memberIds.length > 0) {
      const users = await User.find({ _id: { $in: memberIds } });
      if (users.length !== memberIds.length) {
        return res.status(400).json({ message: 'Jeden lub więcej użytkowników nie istnieje' });
      }
      memberIds.forEach((id) => {
        if (!participants.includes(id.toString())) participants.push(id);
      });
    }

    const data = {
      type: 'group',
      name: name.trim().slice(0, 50),
      description: description ? description.slice(0, 200) : '',
      participants,
      admins: [req.user._id],
    };
    if (req.file) data.avatar = `/uploads/avatars/${req.file.filename}`;

    const conversation = await Conversation.create(data);
    const populated = await populateConversation(Conversation.findById(conversation._id));
    res.status(201).json({ conversation: populated });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const conversation = await populateConversation(
      Conversation.findOne({ _id: req.params.id, participants: req.user._id })
    );
    if (!conversation) {
      return res.status(404).json({ message: 'Rozmowa nie znaleziona' });
    }
    res.json({ conversation });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authMiddleware, avatarUpload.single('avatar'), async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id,
    });
    if (!conversation) return res.status(404).json({ message: 'Rozmowa nie znaleziona' });
    if (conversation.type !== 'group') {
      return res.status(400).json({ message: 'Nie można edytować prywatnych rozmów' });
    }
    if (!conversation.admins.map((a) => a.toString()).includes(req.user._id.toString())) {
      return res.status(403).json({ message: 'Tylko administratorzy mogą edytować grupę' });
    }

    const updateData = {};
    const { name, description } = req.body;
    if (name !== undefined) updateData.name = name.trim().slice(0, 50);
    if (description !== undefined) updateData.description = description.slice(0, 200);
    if (req.file) updateData.avatar = `/uploads/avatars/${req.file.filename}`;

    const updated = await populateConversation(
      Conversation.findByIdAndUpdate(req.params.id, updateData, { new: true })
    );
    res.json({ conversation: updated });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/members', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.body;
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id,
    });
    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ message: 'Grupa nie znaleziona' });
    }
    if (!conversation.admins.map((a) => a.toString()).includes(req.user._id.toString())) {
      return res.status(403).json({ message: 'Tylko administratorzy mogą dodawać członków' });
    }
    if (conversation.participants.map((p) => p.toString()).includes(userId)) {
      return res.status(400).json({ message: 'Użytkownik jest już w grupie' });
    }
    const userToAdd = await User.findById(userId);
    if (!userToAdd) return res.status(404).json({ message: 'Użytkownik nie znaleziony' });

    conversation.participants.push(userId);
    await conversation.save();

    const updated = await populateConversation(Conversation.findById(conversation._id));
    res.json({ conversation: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/members/:userId', authMiddleware, async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id,
    });
    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ message: 'Grupa nie znaleziona' });
    }

    const isAdmin = conversation.admins.map((a) => a.toString()).includes(req.user._id.toString());
    const isSelf = req.params.userId === req.user._id.toString();

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: 'Brak uprawnień' });
    }

    conversation.participants = conversation.participants.filter(
      (p) => p.toString() !== req.params.userId
    );
    conversation.admins = conversation.admins.filter(
      (a) => a.toString() !== req.params.userId
    );
    await conversation.save();

    res.json({ message: 'Usunięto z grupy' });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/messages', authMiddleware, async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id,
    });
    if (!conversation) {
      return res.status(404).json({ message: 'Rozmowa nie znaleziona' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find({
        conversation: req.params.id,
        deletedFor: { $ne: req.user._id },
      })
        .populate('sender', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments({
        conversation: req.params.id,
        deletedFor: { $ne: req.user._id },
      }),
    ]);

    res.json({
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + messages.length < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/messages', authMiddleware, messageFileUpload.single('file'), async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id,
    });
    if (!conversation) {
      return res.status(404).json({ message: 'Rozmowa nie znaleziona' });
    }

    const { content } = req.body;

    if (!content && !req.file) {
      return res.status(400).json({ message: 'Treść wiadomości lub plik jest wymagany' });
    }

    const msgData = {
      conversation: req.params.id,
      sender: req.user._id,
      readBy: [{ user: req.user._id }],
    };

    if (req.file) {
      const isImage = /jpeg|jpg|png|gif|webp/.test(req.file.mimetype);
      msgData.type = isImage ? 'image' : 'file';
      msgData.fileUrl = `/uploads/messages/${req.file.filename}`;
      msgData.fileName = req.file.originalname;
      msgData.content = content || '';
    } else {
      msgData.type = 'text';
      msgData.content = content.slice(0, 5000);
    }

    const message = await Message.create(msgData);
    const populated = await Message.findById(message._id).populate('sender', 'username avatar');

    await Conversation.findByIdAndUpdate(req.params.id, {
      lastMessage: message._id,
      updatedAt: Date.now(),
    });

    if (req.io) {
      req.io.to(req.params.id).emit('new_message', populated);

      const updatedConv = await populateConversation(Conversation.findById(req.params.id));
      conversation.participants.forEach((pid) => {
        req.io.to(`user_${pid}`).emit('conversation_updated', updatedConv);
      });
    }

    res.status(201).json({ message: populated });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/messages/:messageId/read', authMiddleware, async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id,
    });
    if (!conversation) return res.status(403).json({ message: 'Brak dostępu' });

    const message = await Message.findOne({
      _id: req.params.messageId,
      conversation: req.params.id,
    });
    if (!message) return res.status(404).json({ message: 'Wiadomość nie znaleziona' });

    const alreadyRead = message.readBy.some(
      (r) => r.user.toString() === req.user._id.toString()
    );
    if (!alreadyRead) {
      message.readBy.push({ user: req.user._id });
      await message.save();
    }

    res.json({ message: 'Oznaczono jako przeczytane' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
