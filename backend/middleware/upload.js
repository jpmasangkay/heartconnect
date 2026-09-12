const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const FileType = require('file-type');

// Ensure upload directories exist
const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');
['chat', 'verification'].forEach((dir) => {
  const p = path.join(UPLOAD_ROOT, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES  = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
];

const memoryStorage = multer.memoryStorage();
const baseChatMulter = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const baseVerificationMulter = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

/**
 * Validates memory buffer via file-type magic bytes and commits to disk
 */
function createMagicByteUpload(baseMulter, fieldName, targetDir, allowedTypes) {
  const single = baseMulter.single(fieldName);

  return (req, res, next) => {
    single(req, res, async (err) => {
      if (err) return next(err);
      if (!req.file) return next();

      try {
        const detected = await FileType.fromBuffer(req.file.buffer);

        // If file-type detects a mime, verify it
        if (detected) {
          if (!allowedTypes.includes(detected.mime)) {
            return res.status(400).json({
              message: `File content rejected: magic bytes (${detected.mime}) do not match allowed types.`,
            });
          }
          req.file.mimetype = detected.mime;
        } else {
          // Fallback check for plain text or formats without signature
          if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ message: 'File type not allowed' });
          }
        }

        const ext = detected ? `.${detected.ext}` : (path.extname(req.file.originalname) || '.bin');
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
        const targetPath = path.join(UPLOAD_ROOT, targetDir, filename);

        await fs.promises.writeFile(targetPath, req.file.buffer);

        req.file.filename = filename;
        req.file.path = targetPath;
        next();
      } catch (validationErr) {
        return res.status(500).json({ message: 'Error processing file upload', error: validationErr.message });
      }
    });
  };
}

const chatUpload = {
  single: (field) => createMagicByteUpload(baseChatMulter, field, 'chat', ALLOWED_FILE_TYPES),
};

const verificationUpload = {
  single: (field) => createMagicByteUpload(baseVerificationMulter, field, 'verification', ALLOWED_IMAGE_TYPES),
};

module.exports = {
  chatUpload,
  verificationUpload,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_FILE_TYPES,
};
