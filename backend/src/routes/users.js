const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { avatarUpload } = require('../middleware/upload');

const router = express.Router();

router.get('/search', authMiddleware, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.json({ users: [] });
    }

    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const users = await User.find({
      _id: { $ne: req.user._id },
      username: { $regex: escaped, $options: 'i' },
    })
      .select('-password')
      .limit(20);

    res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.put('/profile', authMiddleware, avatarUpload.single('avatar'), async (req, res, next) => {
  try {
    const { username, bio } = req.body;
    const updateData = {};

    if (username !== undefined) {
      const trimmed = username.trim();
      if (trimmed.length < 3 || trimmed.length > 30) {
        return res.status(400).json({ message: 'Nazwa użytkownika musi mieć 3-30 znaków' });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
        return res.status(400).json({ message: 'Nazwa może zawierać tylko litery, cyfry i _' });
      }
      const existing = await User.findOne({ username: trimmed, _id: { $ne: req.user._id } });
      if (existing) {
        return res.status(409).json({ message: 'Nazwa użytkownika jest już zajęta' });
      }
      updateData.username = trimmed;
    }

    if (bio !== undefined) {
      updateData.bio = bio.slice(0, 200);
    }

    if (req.file) {
      updateData.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true }).select('-password');

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
