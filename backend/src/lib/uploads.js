// Shared, hardened image-upload helper for operator and tour photos.
//
// Fixes over the old per-route multer setup:
//  - The file extension is derived from the DETECTED image type, never from
//    the client-supplied originalname or mimetype. Only jpg/png/webp are
//    accepted, so an SVG/HTML file can never be stored and served (with
//    script) from the API's own origin.
//  - Magic bytes are checked after the upload lands on disk; a file that
//    claims to be an image but isn't is deleted and rejected.
//  - Files are stored under UPLOADS_DIR. Point it at a mounted volume in
//    production (e.g. /data/uploads next to DB_PATH) or photos vanish on
//    every redeploy. Defaults to <backend>/uploads for local dev.

import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const UPLOADS_ROOT = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '../../uploads');

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// Returns '.jpg' | '.png' | '.webp' from the file's first bytes, or null.
function detectImageExt(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(12);
    fs.readSync(fd, buf, 0, 12, 0);
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
    if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png';
    if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return '.webp';
    return null;
  } finally {
    fs.closeSync(fd);
  }
}

export function createImageUpload(subdir) {
  const dir = path.join(UPLOADS_ROOT, subdir);
  fs.mkdirSync(dir, { recursive: true });

  const upload = multer({
    storage: multer.diskStorage({
      destination: dir,
      filename: (req, file, cb) => {
        cb(null, `${req.user.userId}-${Date.now()}${EXT_BY_MIME[file.mimetype] ?? '.bin'}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, Object.hasOwn(EXT_BY_MIME, file.mimetype)),
  });

  // Middleware: multer + magic-byte verification. On success req.file is
  // set and req.file.filename has the verified extension.
  function single(field) {
    const run = upload.single(field);
    return (req, res, next) => {
      run(req, res, (err) => {
        if (err) {
          const tooBig = err.code === 'LIMIT_FILE_SIZE';
          return res.status(tooBig ? 413 : 400).json({ error: tooBig ? 'image must be 5 MB or smaller' : 'upload failed' });
        }
        if (!req.file) return next(); // route replies "a valid image file is required"

        const realExt = detectImageExt(req.file.path);
        if (!realExt) {
          fs.unlink(req.file.path, () => {});
          req.file = undefined;
          return next();
        }
        if (path.extname(req.file.filename) !== realExt) {
          const fixed = req.file.filename.replace(/\.[^.]+$/, realExt);
          fs.renameSync(req.file.path, path.join(dir, fixed));
          req.file.filename = fixed;
          req.file.path = path.join(dir, fixed);
        }
        next();
      });
    };
  }

  return { single };
}
