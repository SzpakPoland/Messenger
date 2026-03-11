const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ALLOWED_IMAGE_TYPES = /jpeg|jpg|png|gif|webp/;
const ALLOWED_FILE_TYPES = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt|zip/;

const createStorage = (destination) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, destination);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  });

const imageFileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (ALLOWED_IMAGE_TYPES.test(ext) && ALLOWED_IMAGE_TYPES.test(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error('Dozwolone są tylko pliki graficzne (jpg, png, gif, webp)'));
};

const avatarUpload = multer({
  storage: createStorage('uploads/avatars'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

const messageFileUpload = multer({
  storage: createStorage('uploads/messages'),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (ALLOWED_FILE_TYPES.test(ext)) {
      return cb(null, true);
    }
    cb(new Error('Niedozwolony typ pliku'));
  },
});

module.exports = { avatarUpload, messageFileUpload };
