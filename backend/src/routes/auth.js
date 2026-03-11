const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { avatarUpload } = require('../middleware/upload');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { message: 'Zbyt wiele prób, spróbuj ponownie za 15 minut' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });

const sendAuthResponse = (res, user, statusCode = 200) => {
  const token = generateToken(user._id);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.status(statusCode).json({ user: user.toPublicJSON(), token });
};

router.post('/register', authLimiter, avatarUpload.single('avatar'), async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Wszystkie pola są wymagane' });
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      return res.status(400).json({ message: 'Nazwa użytkownika musi mieć 3-30 znaków' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      return res.status(400).json({ message: 'Nazwa może zawierać tylko litery, cyfry i _' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Hasło musi mieć co najmniej 6 znaków' });
    }

    const existing = await User.findOne({ username: trimmedUsername });

    if (existing) {
      return res.status(409).json({ message: 'Nazwa użytkownika jest już zajęta' });
    }

    const userData = {
      username: trimmedUsername,
      password,
    };

    if (req.file) {
      userData.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    const user = await User.create(userData);
    sendAuthResponse(res, user, 201);
  } catch (error) {
    next(error);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Nazwa użytkownika i hasło są wymagane' });
    }

    const user = await User.findOne({ username: username.trim() });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Nieprawidłowa nazwa użytkownika lub hasło' });
    }

    sendAuthResponse(res, user);
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });
  res.json({ message: 'Wylogowano pomyślnie' });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
});

router.put('/change-password', authMiddleware, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Aktualne i nowe hasło są wymagane' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Nowe hasło musi mieć co najmniej 6 znaków' });
    }

    const user = await User.findById(req.user._id);
    const isCorrect = await user.comparePassword(currentPassword);

    if (!isCorrect) {
      return res.status(401).json({ message: 'Aktualne hasło jest nieprawidłowe' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Hasło zostało zmienione' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
