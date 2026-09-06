
// Task 6: Operator profile create/read/update.
// Operator/traveler dual-mode account model: an operator profile is now
// owned by the user account that created it (user_id). Creating or
// editing a profile requires a valid session; ownership is always
// derived from the verified token, never trusted from the request body.

import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads/operators');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(null, `${req.user.userId}-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

// Always starts with +994 - the profile form fixes that prefix and only
// lets the operator type the digits after it.
function isValidPhone(phone) {
  return /^\+994\d{7,12}$/.test(phone);
}

router.post('/', requireAuth, (req, res) => {
  const { name, description, languages, photo_url, phone, instagram } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!phone || !isValidPhone(phone)) {
    return res.status(400).json({ error: 'a valid phone number starting with +994 is required' });
  }

  const existing = db.prepare('SELECT id FROM operators WHERE user_id = ?').get(req.user.userId);
  if (existing) {
    return res.status(409).json({ error: 'you already have an operator profile — use PUT to update it' });
  }

  const result = db
    .prepare(
      `INSERT INTO operators (name, description, languages, photo_url, phone, instagram, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(name, description ?? null, languages ?? null, photo_url ?? null, phone, instagram ?? null, req.user.userId);

  const operator = db.prepare('SELECT * FROM operators WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(operator);
});

// "Do I have an operator profile?" — this is what drives the
// Traveler/Operator toggle on the frontend. Returns null (not a 404)
// when the answer is no, since that's a normal state, not an error.
// Must be declared before GET /:id, or Express would match "me" as :id.
router.get('/me', requireAuth, (req, res) => {
  const operator = db.prepare('SELECT * FROM operators WHERE user_id = ?').get(req.user.userId);
  res.json(operator ?? null);
});

// Profile photo upload - separate from PUT /:id since that route takes a
// plain JSON body, not multipart. Only for an operator profile that
// already exists (create it first via POST /, then add a photo).
router.post('/me/photo', requireAuth, upload.single('photo'), (req, res) => {
  const operator = db.prepare('SELECT * FROM operators WHERE user_id = ?').get(req.user.userId);
  if (!operator) return res.status(404).json({ error: 'create your operator profile first' });
  if (!req.file) return res.status(400).json({ error: 'a valid image file is required' });

  const photoUrl = `/uploads/operators/${req.file.filename}`;
  db.prepare('UPDATE operators SET photo_url = ? WHERE id = ?').run(photoUrl, operator.id);
  res.json(db.prepare('SELECT * FROM operators WHERE id = ?').get(operator.id));
});

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM operators ORDER BY rating DESC').all());
});

router.get('/:id', (req, res) => {
  const operator = db.prepare('SELECT * FROM operators WHERE id = ?').get(req.params.id);
  if (!operator) return res.status(404).json({ error: 'operator not found' });
  res.json(operator);
});

router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM operators WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'operator not found' });
  if (existing.user_id !== req.user.userId) {
    return res.status(403).json({ error: 'you can only edit your own operator profile' });
  }

  const updated = { ...existing, ...req.body };
  if (!updated.phone || !isValidPhone(updated.phone)) {
    return res.status(400).json({ error: 'a valid phone number starting with +994 is required' });
  }
  db.prepare(
    `UPDATE operators SET name=?, description=?, languages=?, photo_url=?, vehicle_features=?, phone=?, instagram=? WHERE id=?`
  ).run(
    updated.name,
    updated.description,
    updated.languages,
    updated.photo_url,
    updated.vehicle_features,
    updated.phone,
    updated.instagram,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM operators WHERE id = ?').get(req.params.id));
});

export default router;
