import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3001);
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-in-production';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'sino0491';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Ktrill20!';
const PROD = process.env.NODE_ENV === 'production';
const TOKEN_TTL = '7d';
const USERS_PATH = path.join(__dirname, 'data', 'users.json');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

function ensureDataFile() {
  if (!fs.existsSync(path.dirname(USERS_PATH))) {
    fs.mkdirSync(path.dirname(USERS_PATH), { recursive: true });
  }
  if (!fs.existsSync(USERS_PATH)) {
    fs.writeFileSync(USERS_PATH, JSON.stringify({ users: [] }, null, 2));
  }
}

function readStore() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(USERS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.users) ? parsed : { users: [] };
  } catch {
    return { users: [] };
  }
}

function writeStore(store) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(store, null, 2));
}

async function seedAdmin() {
  const store = readStore();
  const existing = store.users.find((u) => u.username.toLowerCase() === ADMIN_USERNAME.toLowerCase());
  if (existing) return;
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  store.users.push({
    id: randomUUID(),
    username: ADMIN_USERNAME,
    passwordHash,
    role: 'admin',
    vendorId: null,
    vendorName: null,
    vendorLocation: null,
    createdAt: Date.now()
  });
  writeStore(store);
}

function makeSessionToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
      vendorId: user.vendorId || null
    },
    SESSION_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

function sessionCookie(token) {
  return {
    httpOnly: true,
    secure: PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    value: token
  };
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    vendorId: user.vendorId || undefined,
    vendorName: user.vendorName || undefined,
    vendorLocation: user.vendorLocation || undefined
  };
}

function authRequired(req, res, next) {
  const token = req.cookies.ai_session;
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const payload = jwt.verify(token, SESSION_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid session' });
  }
}

app.get('/api/health', (_, res) => {
  res.json({ ok: true });
});

app.get('/api/auth/me', authRequired, (req, res) => {
  const store = readStore();
  const user = store.users.find((u) => u.id === req.user.sub);
  if (!user) {
    res.clearCookie('ai_session', { path: '/' });
    res.status(401).json({ error: 'Session user not found' });
    return;
  }
  res.json({ user: sanitizeUser(user) });
});

app.post('/api/auth/signup', async (req, res) => {
  const { username, password, role, vendorName, vendorLocation } = req.body ?? {};
  const normalizedRole = role === 'vendor' ? 'vendor' : role === 'individual' ? 'individual' : null;
  if (!username || typeof username !== 'string') {
    res.status(400).json({ error: 'Username is required' });
    return;
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }
  if (!normalizedRole) {
    res.status(400).json({ error: 'Role must be individual or vendor' });
    return;
  }

  const store = readStore();
  const exists = store.users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  if (exists) {
    res.status(409).json({ error: 'Username already exists' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = {
    id: randomUUID(),
    username: username.trim(),
    passwordHash,
    role: normalizedRole,
    vendorId: normalizedRole === 'vendor' ? `vx-${Date.now()}` : null,
    vendorName: normalizedRole === 'vendor' ? String(vendorName || `${username.trim()} Performance`) : null,
    vendorLocation: normalizedRole === 'vendor' ? String(vendorLocation || 'Unknown, USA') : null,
    createdAt: Date.now()
  };

  store.users.push(user);
  writeStore(store);

  const token = makeSessionToken(user);
  const cookie = sessionCookie(token);
  res.cookie('ai_session', cookie.value, cookie);
  res.status(201).json({ user: sanitizeUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const store = readStore();
  const user = store.users.find((u) => u.username.toLowerCase() === String(username).trim().toLowerCase());
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = makeSessionToken(user);
  const cookie = sessionCookie(token);
  res.cookie('ai_session', cookie.value, cookie);
  res.json({ user: sanitizeUser(user) });
});

app.post('/api/auth/logout', (_, res) => {
  res.clearCookie('ai_session', {
    httpOnly: true,
    secure: PROD,
    sameSite: 'lax',
    path: '/'
  });
  res.json({ ok: true });
});

app.listen(PORT, async () => {
  await seedAdmin();
  console.log(`AutoIndex auth server listening on http://localhost:${PORT}`);
});
