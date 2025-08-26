import express from 'express';
import cors from 'cors';
import { readStore, writeStore } from './storage.js';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const app = express();
const PORT = process.env.PORT || 4000;

// Configure CORS to allow requests from specified origins in production
// In development, allow requests from any origin
const corsOrigins = process.env.NODE_ENV === 'production' && process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : '*';

app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '5mb' }));
app.set('trust proxy', 1);

// Uploads directory - handle both local development and production paths
const UPLOAD_DIR = process.env.NODE_ENV === 'production'
  ? path.resolve(process.cwd(), 'uploads')
  : path.resolve(process.cwd(), 'server', 'uploads');
  
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({ storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
  const relative = `/uploads/${req.file.filename}`;
  const origin = `${req.protocol}://${req.get('host')}`;
  const url = `${origin}${relative}`;
  res.status(201).json({ url, relative });
});

// Categories CRUD
app.get('/api/categories', async (_req, res) => {
  const db = await readStore();
  res.json(db.categories || []);
});
app.post('/api/categories', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const db = await readStore();
  if ((db.categories || []).some((c) => c.name.toLowerCase() === String(name).toLowerCase())) {
    return res.status(409).json({ error: 'category exists' });
  }
  const category = { id: randomUUID(), name };
  db.categories.push(category);
  await writeStore(db);
  res.status(201).json(category);
});
app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  const db = await readStore();
  const before = db.categories.length;
  db.categories = db.categories.filter((c) => c.id !== id);
  if (db.categories.length === before) return res.status(404).json({ error: 'not found' });
  await writeStore(db);
  res.status(204).end();
});

// Flash Sale settings
app.get('/api/flash', async (_req, res) => {
  const db = await readStore();
  res.json(db.flash || { enabled: false, bannerUrl: '' });
});
app.put('/api/flash', async (req, res) => {
  const { enabled, bannerUrl } = req.body || {};
  const db = await readStore();
  db.flash = { enabled: Boolean(enabled), bannerUrl: bannerUrl || '' };
  await writeStore(db);
  res.json(db.flash);
});

// Helper: validate category exists
async function assertCategoryExists(category) {
  const db = await readStore();
  return (db.categories || []).some((c) => c.name === category || c.id === category);
}

function hashPassword(pw) {
  return crypto.createHash('sha256').update(String(pw)).digest('hex');
}

// Auth endpoints (demo)
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const db = await readStore();
  if (db.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) return res.status(409).json({ error: 'user exists' });
  const user = { id: crypto.randomUUID(), email, passwordHash: hashPassword(password) };
  db.users.push(user);
  await writeStore(db);
  const token = crypto.randomUUID();
  db.sessions.push({ token, userId: user.id, createdAt: Date.now() });
  await writeStore(db);
  res.json({ token, user: { id: user.id, email: user.email } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const db = await readStore();
  const user = db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user || user.passwordHash !== hashPassword(password)) return res.status(401).json({ error: 'invalid credentials' });
  const token = crypto.randomUUID();
  db.sessions.push({ token, userId: user.id, createdAt: Date.now() });
  await writeStore(db);
  res.json({ token, user: { id: user.id, email: user.email } });
});

app.get('/api/auth/me', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'missing token' });
  const db = await readStore();
  const sess = db.sessions.find((s) => s.token === token);
  if (!sess) return res.status(401).json({ error: 'invalid token' });
  const user = db.users.find((u) => u.id === sess.userId);
  if (!user) return res.status(401).json({ error: 'invalid token' });
  res.json({ id: user.id, email: user.email });
});

// Generic helpers
const createCrud = (key) => {
  const base = `/api/${key}`;

  app.get(base, async (_req, res) => {
    const db = await readStore();
    res.json(db[key] || []);
  });

  app.post(base, async (req, res) => {
    const db = await readStore();
    const collection = db[key] || [];
    if (key === 'products') {
      const { category } = req.body || {};
      if (!category || !(await assertCategoryExists(category))) {
        return res.status(400).json({ error: 'Valid category required' });
      }
    }
    const item = { id: randomUUID(), createdAt: Date.now(), ...req.body };
    collection.push(item);
    db[key] = collection;
    await writeStore(db);
    res.status(201).json(item);
  });

  app.put(`${base}/:id`, async (req, res) => {
    const { id } = req.params;
    const db = await readStore();
    const collection = db[key] || [];
    const idx = collection.findIndex((x) => x.id === id);
    if (idx === -1) return res.status(404).json({ error: `${key.slice(0, -1)} not found` });
    if (key === 'products' && req.body && req.body.category) {
      if (!(await assertCategoryExists(req.body.category))) {
        return res.status(400).json({ error: 'Valid category required' });
      }
    }
    collection[idx] = { ...collection[idx], ...req.body, id };
    db[key] = collection;
    await writeStore(db);
    res.json(collection[idx]);
  });

  app.delete(`${base}/:id`, async (req, res) => {
    const { id } = req.params;
    const db = await readStore();
    const collection = db[key] || [];
    const next = collection.filter((x) => x.id !== id);
    if (next.length === collection.length) return res.status(404).json({ error: `${key.slice(0, -1)} not found` });
    db[key] = next;
    await writeStore(db);
    res.status(204).end();
  });
};

createCrud('products');
createCrud('events');
createCrud('sales');

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
