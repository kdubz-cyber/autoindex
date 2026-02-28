import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
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
const PROD = process.env.NODE_ENV === 'production';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || (PROD ? '' : 'sino0491');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (PROD ? '' : 'Ktrill20!');
const TOKEN_TTL = '7d';
const USERS_PATH = path.join(__dirname, 'data', 'users.json');
const HTTP_TIMEOUT_MS = 7000;
const META_CL_BASE_URL = process.env.META_CL_BASE_URL || 'https://graph.facebook.com/v22.0';
const META_CL_ACCESS_TOKEN = process.env.META_CL_ACCESS_TOKEN || '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean);

const app = express();
const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (!ALLOWED_ORIGINS.length && !PROD) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const BRAND_REPUTATION = {
  oem: { score: 4.8, verifiedSignals: 3200 },
  brembo: { score: 4.7, verifiedSignals: 1180 },
  borla: { score: 4.6, verifiedSignals: 740 },
  enkei: { score: 4.5, verifiedSignals: 690 },
  pioneer: { score: 4.4, verifiedSignals: 1100 },
  garrett: { score: 4.7, verifiedSignals: 530 },
  'bc racing': { score: 4.5, verifiedSignals: 880 }
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function smallHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

async function fetchWithTimeout(url, init = {}, timeoutMs = HTTP_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function parseMetaContent(html, prop) {
  const rx = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
  const match = html.match(rx);
  return match?.[1]?.trim() || null;
}

function parsePrice(text) {
  if (!text) return null;
  const match = String(text).replace(/,/g, '').match(/\$?\s*([0-9]+(?:\.[0-9]{1,2})?)/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  return value;
}

function parsePartYearInput(raw) {
  if (raw == null) return null;
  const digits = String(raw).replace(/[^0-9]/g, '');
  if (!digits) return null;
  const year = Number(digits.slice(0, 4));
  const currentYear = new Date().getFullYear();
  if (!Number.isFinite(year)) return null;
  if (year < 1950 || year > currentYear + 1) return null;
  return year;
}

function parseEngineMilesInput(raw) {
  if (raw == null) return null;
  const digits = String(raw).replace(/[^0-9]/g, '');
  if (!digits) return null;
  const miles = Number(digits);
  if (!Number.isFinite(miles) || miles <= 0) return null;
  return miles;
}

function normalizeBrand(title) {
  if (!title) return 'oem';
  const t = title.toLowerCase();
  const known = Object.keys(BRAND_REPUTATION).find((b) => t.includes(b));
  return known || 'oem';
}

function ageFactor(partType, ageBand) {
  const table = {
    new_0_1: { OEM: 1.0, Performance: 1.0 },
    years_1_3: { OEM: 0.9, Performance: 0.85 },
    years_3_7: { OEM: 0.75, Performance: 0.7 },
    years_7_15: { OEM: 0.65, Performance: 0.6 },
    years_15_plus: { OEM: 0.6, Performance: 0.55 }
  };
  return table[ageBand]?.[partType] ?? 0.75;
}

function conditionFactor(condition) {
  if (condition === 'New') return 1.0;
  if (condition === 'Aftermarket') return 0.75;
  return 0.65;
}

function availabilityFactor(isMarketplaceLink) {
  return isMarketplaceLink ? 1.1 : 1.0;
}

function engineMileageFactor(category, condition, engineMiles) {
  if (category !== 'Engine' || engineMiles == null || condition === 'New') return 1;
  if (engineMiles <= 30000) return 1;
  if (engineMiles <= 60000) return 0.95;
  if (engineMiles <= 100000) return 0.88;
  if (engineMiles <= 150000) return 0.78;
  return 0.68;
}

function demandFactor(category) {
  const map = {
    Engine: 1.1,
    Suspension: 1.0,
    Transmission: 1.05,
    Brakes: 1.1,
    Rims: 1.05,
    Tires: 1.0,
    Exhaust: 1.05,
    Chassis: 1.0,
    Audio: 0.95
  };
  return map[category] ?? 1.0;
}

function inferAgeBand(title = '', condition = 'Used', partYear = null) {
  const year = parsePartYearInput(partYear);
  if (year != null) {
    const currentYear = new Date().getFullYear();
    const age = clamp(currentYear - year, 0, 80);
    if (age <= 1) return 'new_0_1';
    if (age <= 3) return 'years_1_3';
    if (age <= 7) return 'years_3_7';
    if (age <= 15) return 'years_7_15';
    return 'years_15_plus';
  }

  const t = String(title).toLowerCase();
  if (condition === 'New' || /brand\s*new|new\b|bnib|sealed|unused/.test(t)) return 'new_0_1';
  if (/15\+\s*(years?|yrs?)|15\s*plus|vintage|classic|nla|discontinued/.test(t)) return 'years_15_plus';
  if (/7\s*(?:-|to)\s*15\s*(years?|yrs?)/.test(t)) return 'years_7_15';
  if (/3\s*(?:-|to)\s*7\s*(years?|yrs?)/.test(t)) return 'years_3_7';
  if (/1\s*(?:-|to)\s*3\s*(years?|yrs?)/.test(t)) return 'years_1_3';
  if (/\b([89]|1[0-5])\s*(years?|yrs?)\s*old\b/.test(t)) return 'years_7_15';
  if (/\b([4-7])\s*(years?|yrs?)\s*old\b/.test(t)) return 'years_3_7';
  if (/\b([1-3])\s*(years?|yrs?)\s*old\b/.test(t)) return 'years_1_3';
  if (condition === 'Aftermarket') return 'years_1_3';
  if (condition === 'Used') return 'years_7_15';
  return 'years_3_7';
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function classifyPriceSignal(price, marketRange) {
  if (price == null) return 'At market';
  if (price < marketRange.mid * 0.9) return 'Under market';
  if (price > marketRange.mid * 1.1) return 'Over market';
  return 'At market';
}

function applyPriceDealPenalty(score10, price, marketRange) {
  if (price == null || !marketRange?.mid) return score10;
  const ratio = price / marketRange.mid;
  let adjusted = score10;

  if (ratio > 1) adjusted -= Math.min((ratio - 1) * 4.5, 3.5);
  if (price > marketRange.high) adjusted = Math.min(adjusted, 4.8);
  if (ratio >= 1.35) adjusted = Math.min(adjusted, 3.8);
  if (ratio >= 1.6) adjusted = Math.min(adjusted, 2.8);

  return Math.round(clamp(adjusted, 1, 10) * 10) / 10;
}

function priceFitNorm(price, marketRangeMid) {
  if (price == null || !marketRangeMid) return 0.62;
  const delta = Math.abs(price - marketRangeMid) / marketRangeMid;
  return clamp(1 - delta, 0.2, 1);
}

function valuationConfidenceNorm({ sourceFetched, hasPrice, hasTitle, hasBuyerGeo }) {
  let score = 0.55;
  if (sourceFetched) score += 0.2;
  if (hasPrice) score += 0.15;
  if (hasTitle) score += 0.05;
  if (hasBuyerGeo) score += 0.05;
  return clamp(score, 0.35, 1);
}

function compositeScore10({
  repScoreNorm,
  demandNorm,
  distanceNorm,
  tenureNorm,
  priceNorm,
  confidenceNorm
}) {
  const weighted =
    repScoreNorm * 0.2 +
    demandNorm * 0.12 +
    distanceNorm * 0.12 +
    tenureNorm * 0.14 +
    priceNorm * 0.32 +
    confidenceNorm * 0.1;
  return Math.round(clamp(weighted, 0.1, 1) * 100) / 10;
}

function scoreMarketListing({
  title,
  category,
  condition,
  price,
  partYear,
  engineMiles,
  isMarketplaceSource,
  distanceMiles,
  sellerTenureMonths,
  sourceFetched = false,
  hasBuyerGeo = false
}) {
  const brandKey = normalizeBrand(title);
  const rep = BRAND_REPUTATION[brandKey] ?? BRAND_REPUTATION.oem;
  const inferredPartType = condition === 'Aftermarket' ? 'Performance' : 'OEM';
  const normalizedEngineMiles = parseEngineMilesInput(engineMiles);
  const af = ageFactor(inferredPartType, inferAgeBand(title, condition, partYear));
  const cf = Math.round(
    conditionFactor(condition) * engineMileageFactor(category, condition, normalizedEngineMiles) * 1000
  ) / 1000;
  const avf = availabilityFactor(isMarketplaceSource);
  const mdf = demandFactor(category);
  const baseAnchor = Math.max(price ?? 300, 50);
  const fmv = Math.round(baseAnchor * af * cf * avf * mdf);
  const marketRange = {
    low: Math.round(fmv * 0.88),
    mid: fmv,
    high: Math.round(fmv * 1.18)
  };
  const priceSignal = classifyPriceSignal(price, marketRange);
  const repScoreNorm = clamp((rep.score - 3.5) / 1.5, 0, 1);
  const demandNorm = clamp((mdf - 0.85) / 0.35, 0, 1);
  const distanceNorm = clamp(1 - distanceMiles / 220, 0, 1);
  const tenureNorm = clamp(sellerTenureMonths / 24, 0, 1);
  const priceNorm = priceFitNorm(price, marketRange.mid);
  const confidenceNorm = valuationConfidenceNorm({
    sourceFetched,
    hasPrice: price != null,
    hasTitle: Boolean(title),
    hasBuyerGeo
  });
  const rawScore10 = compositeScore10({
    repScoreNorm,
    demandNorm,
    distanceNorm,
    tenureNorm,
    priceNorm,
    confidenceNorm
  });
  const score10 = applyPriceDealPenalty(rawScore10, price, marketRange);

  const riskFlags = [];
  if (sellerTenureMonths < 6) riskFlags.push('Seller presence appears relatively new.');
  if (distanceMiles > 90) riskFlags.push('Long pickup distance increases risk and friction.');
  if (priceSignal === 'Under market') riskFlags.push('Price is below market; verify authenticity and condition.');
  if (priceSignal === 'Over market') riskFlags.push('Ask price is above estimated FMV range.');
  if (price != null && Math.abs(price - marketRange.mid) / marketRange.mid > 0.35) {
    riskFlags.push('Ask price deviates significantly from FMV estimate.');
  }
  if (condition === 'Used') riskFlags.push('Used part: request serials, photos, and fitment proof.');
  if (category === 'Engine' && normalizedEngineMiles == null) {
    riskFlags.push('Engine mileage missing; provide miles for tighter valuation confidence.');
  }
  if (category === 'Engine' && normalizedEngineMiles != null && normalizedEngineMiles >= 120000) {
    riskFlags.push('High engine mileage can materially reduce fair market value.');
  }
  if (rep.verifiedSignals < 200) riskFlags.push('Limited verified purchase signal volume for this part family.');

  return {
    valuation: {
      formula: {
        baseAnchor,
        ageFactor: af,
        conditionFactor: cf,
        availabilityFactor: avf,
        marketDemandFactor: mdf
      },
      marketRange,
      fairMarketValue: marketRange.mid,
      priceSignal
    },
    intelligence: {
      sellerTenureMonths,
      estimatedDistanceMiles: distanceMiles,
      partReputation: {
        score5: rep.score,
        verifiedPurchaseSignals: rep.verifiedSignals,
        brandKey
      },
      scoreInputs: {
        priceNorm,
        repScoreNorm,
        demandNorm,
        distanceNorm,
        tenureNorm,
        confidenceNorm
      },
      score10,
      riskFlags
    }
  };
}

function normalizeMarketplaceNode(node, fallbackCategory, fallbackCondition, buyerGeo) {
  const listingDetails = node?.listing_details || node?.listingDetails || {};
  const title = listingDetails?.title || node?.title || 'Unknown listing';
  const description = listingDetails?.description || node?.description || '';
  const price = safeNumber(listingDetails?.price?.amount) ?? parsePrice(listingDetails?.price) ?? parsePrice(node?.price) ?? parsePrice(`${title} ${description}`);
  const lat = safeNumber(node?.location?.latitude) ?? safeNumber(node?.latitude);
  const lon = safeNumber(node?.location?.longitude) ?? safeNumber(node?.longitude);
  const seededSeller = {
    lat: lat ?? (40 + (smallHash(`${node?.id || title}-lat`) % 900) / 100),
    lon: lon ?? (-124 + (smallHash(`${node?.id || title}-lon`) % 580) / 10)
  };
  const distance = haversineMiles(buyerGeo, seededSeller) ?? (20 + (smallHash(`${node?.id || title}-dist`) % 180));
  const sellerTenureMonths = 3 + (smallHash(`${node?.id || title}-tenure`) % 84);
  const scored = scoreMarketListing({
    title,
    category: fallbackCategory,
    condition: fallbackCondition,
    price,
    isMarketplaceSource: true,
    distanceMiles: distance,
    sellerTenureMonths,
    sourceFetched: true,
    hasBuyerGeo: Boolean(buyerGeo)
  });
  return {
    id: node?.id || `mp-${smallHash(title)}`,
    title,
    description,
    url: node?.url || node?.permalink_url || null,
    price,
    locationText: node?.location?.name || node?.location_text || null,
    createdTime: node?.creation_time || node?.created_time || null,
    viewsBucket: node?.views_bucket || null,
    ...scored
  };
}

async function fetchListingMetadata(url) {
  const isFacebook = /facebook\.com|fb\.com/i.test(url);
  const metadata = {
    platform: isFacebook ? 'Facebook Marketplace' : 'Unknown',
    title: null,
    price: null,
    locationText: null,
    sourceFetched: false
  };
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'AutoIndexBot/1.0 (+https://autoindex.local)'
      }
    });
    if (!res.ok) return metadata;
    const html = await res.text();
    metadata.sourceFetched = true;
    metadata.title =
      parseMetaContent(html, 'og:title') ||
      parseMetaContent(html, 'twitter:title') ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
      null;
    const desc = parseMetaContent(html, 'og:description') || parseMetaContent(html, 'description');
    metadata.price = parsePrice(desc) ?? parsePrice(metadata.title);
    metadata.locationText = parseMetaContent(html, 'og:locality') || null;
  } catch {
    return metadata;
  }
  return metadata;
}

async function geocodeUSZip(zip) {
  if (!zip) return null;
  const clean = String(zip).trim();
  if (!/^\d{5}$/.test(clean)) return null;
  try {
    const res = await fetchWithTimeout(`https://api.zippopotam.us/us/${clean}`);
    if (!res.ok) return null;
    const data = await res.json();
    const place = data?.places?.[0];
    if (!place) return null;
    return {
      lat: Number(place.latitude),
      lon: Number(place.longitude),
      label: `${place['place name']}, ${place['state abbreviation']}`
    };
  } catch {
    return null;
  }
}

function haversineMiles(a, b) {
  if (!a || !b) return null;
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(R * (2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))));
}

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
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    if (!PROD) {
      console.warn('Admin seed skipped: missing ADMIN_USERNAME/ADMIN_PASSWORD');
    }
    return;
  }
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

app.get('/api/system/status', (_, res) => {
  res.json({
    ok: true,
    mode: PROD ? 'production' : 'development',
    metaMarketplaceConfigured: Boolean(META_CL_ACCESS_TOKEN),
    allowedOrigins: ALLOWED_ORIGINS,
    apiVersion: '2026-02-27'
  });
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

app.post('/api/market-intelligence/analyze', async (req, res) => {
  const {
    url,
    buyerZip,
    partCategory,
    partCondition,
    partTitle,
    askPrice,
    partYear,
    engineMiles
  } = req.body ?? {};
  if (!url || typeof url !== 'string' || url.trim().length < 10) {
    res.status(400).json({ error: 'A valid listing URL is required.' });
    return;
  }

  const category = typeof partCategory === 'string' ? partCategory : 'Engine';
  const condition = partCondition === 'New' || partCondition === 'Aftermarket' ? partCondition : 'Used';
  const normalizedPartYear = parsePartYearInput(partYear);
  const normalizedEngineMiles =
    category === 'Engine' ? parseEngineMilesInput(engineMiles) : null;
  const ask = parsePrice(askPrice);
  const meta = await fetchListingMetadata(url.trim());

  const resolvedTitle = (partTitle && String(partTitle).trim()) || meta.title || 'Unknown part';
  const brandKey = normalizeBrand(resolvedTitle);
  const rep = BRAND_REPUTATION[brandKey] ?? BRAND_REPUTATION.oem;

  const inferredPartType = condition === 'Aftermarket' ? 'Performance' : 'OEM';
  const af = ageFactor(
    inferredPartType,
    inferAgeBand(resolvedTitle, condition, normalizedPartYear)
  );
  const cf = Math.round(
    conditionFactor(condition) *
      engineMileageFactor(category, condition, normalizedEngineMiles) *
      1000
  ) / 1000;
  const avf = availabilityFactor(meta.platform === 'Facebook Marketplace');
  const mdf = demandFactor(category);

  const baseAnchor = Math.max(meta.price ?? ask ?? 300, 50);
  const fmv = Math.round(baseAnchor * af * cf * avf * mdf);
  const marketRange = {
    low: Math.round(fmv * 0.88),
    mid: fmv,
    high: Math.round(fmv * 1.18)
  };

  let priceSignal = 'At market';
  const comparedAsk = ask ?? meta.price;
  if (comparedAsk != null) {
    if (comparedAsk < marketRange.mid * 0.9) priceSignal = 'Under market';
    else if (comparedAsk > marketRange.mid * 1.1) priceSignal = 'Over market';
  }

  const buyerGeo = await geocodeUSZip(buyerZip);
  const seededSeller = {
    lat: 40 + (smallHash(url) % 900) / 100,
    lon: -124 + (smallHash(`${url}-seller`) % 580) / 10
  };
  const distance = haversineMiles(buyerGeo, seededSeller) ?? (20 + (smallHash(url) % 180));
  const sellerTenureMonths = 3 + (smallHash(`${url}-tenure`) % 84);

  const riskFlags = [];
  if (meta.platform !== 'Facebook Marketplace') riskFlags.push('URL does not resolve as Facebook Marketplace.');
  if (!meta.sourceFetched) riskFlags.push('Live metadata could not be fetched (privacy/auth/rate limit).');
  if (sellerTenureMonths < 6) riskFlags.push('Seller presence appears relatively new.');
  if (distance > 90) riskFlags.push('Long pickup distance increases risk and friction.');
  if (priceSignal === 'Under market') riskFlags.push('Price is below market; verify authenticity and condition.');
  if (priceSignal === 'Over market') riskFlags.push('Ask price is above estimated FMV range.');
  if (comparedAsk != null && Math.abs(comparedAsk - marketRange.mid) / marketRange.mid > 0.35) {
    riskFlags.push('Ask price deviates significantly from FMV estimate.');
  }
  if (condition === 'Used') riskFlags.push('Used part: request serials, photos, and fitment proof.');
  if (category === 'Engine' && normalizedEngineMiles == null) {
    riskFlags.push('Engine mileage missing; provide miles for tighter valuation confidence.');
  }
  if (category === 'Engine' && normalizedEngineMiles != null && normalizedEngineMiles >= 120000) {
    riskFlags.push('High engine mileage can materially reduce fair market value.');
  }
  if (rep.verifiedSignals < 200) riskFlags.push('Limited verified purchase signal volume for this part family.');

  const repScoreNorm = clamp((rep.score - 3.5) / 1.5, 0, 1);
  const demandNorm = clamp((mdf - 0.85) / 0.35, 0, 1);
  const distanceNorm = clamp(1 - distance / 220, 0, 1);
  const tenureNorm = clamp(sellerTenureMonths / 24, 0, 1);
  const priceNorm = priceFitNorm(comparedAsk, marketRange.mid);
  const confidenceNorm = valuationConfidenceNorm({
    sourceFetched: meta.sourceFetched,
    hasPrice: comparedAsk != null,
    hasTitle: Boolean(resolvedTitle && resolvedTitle !== 'Unknown part'),
    hasBuyerGeo: Boolean(buyerGeo)
  });
  const rawScore10 = compositeScore10({
    repScoreNorm,
    demandNorm,
    distanceNorm,
    tenureNorm,
    priceNorm,
    confidenceNorm
  });
  const score10 = applyPriceDealPenalty(rawScore10, comparedAsk, marketRange);

  res.json({
    platform: meta.platform,
    sourceFetched: meta.sourceFetched,
    listing: {
      url: url.trim(),
      title: resolvedTitle,
      detectedPrice: meta.price ?? null,
      askPrice: comparedAsk ?? null,
      locationText: meta.locationText,
      partYear: normalizedPartYear,
      engineMiles: normalizedEngineMiles,
      condition,
      category
    },
    valuation: {
      formula: {
        baseAnchor,
        ageFactor: af,
        conditionFactor: cf,
        availabilityFactor: avf,
        marketDemandFactor: mdf
      },
      marketRange,
      fairMarketValue: marketRange.mid,
      priceSignal
    },
    intelligence: {
      sellerTenureMonths,
      estimatedDistanceMiles: distance,
      partReputation: {
        score5: rep.score,
        verifiedPurchaseSignals: rep.verifiedSignals,
        brandKey
      },
      scoreInputs: {
        priceNorm,
        repScoreNorm,
        demandNorm,
        distanceNorm,
        tenureNorm,
        confidenceNorm
      },
      score10,
      riskFlags
    }
  });
});

app.post('/api/market-intelligence/search-facebook', async (req, res) => {
  const {
    q,
    categories,
    listingCountries,
    priceMin,
    priceMax,
    since,
    until,
    sort,
    partCategory,
    partCondition,
    buyerZip,
    limit
  } = req.body ?? {};

  if (!META_CL_ACCESS_TOKEN) {
    res.status(503).json({
      error:
        'Meta Content Library API is not configured. Set META_CL_ACCESS_TOKEN on the server environment.'
    });
    return;
  }

  const query = String(q || '').trim();
  if (!query) {
    res.status(400).json({ error: 'Search query (q) is required.' });
    return;
  }

  const normalizedCategory = typeof partCategory === 'string' ? partCategory : 'Engine';
  const normalizedCondition =
    partCondition === 'New' || partCondition === 'Aftermarket' ? partCondition : 'Used';

  const params = new URLSearchParams();
  params.set('q', query);
  params.set(
    'fields',
    'id,url,creation_time,views_bucket,location,listing_details{title,description,price}'
  );
  params.set('access_token', META_CL_ACCESS_TOKEN);

  if (Array.isArray(categories) && categories.length) params.set('categories', categories.join(','));
  if (Array.isArray(listingCountries) && listingCountries.length) {
    params.set('listing_countries', listingCountries.join(','));
  } else {
    params.set('listing_countries', 'US');
  }
  if (priceMin != null && String(priceMin).length) params.set('price_min', String(priceMin));
  if (priceMax != null && String(priceMax).length) params.set('price_max', String(priceMax));
  if (since) params.set('since', String(since));
  if (until) params.set('until', String(until));
  if (sort) params.set('sort', String(sort));
  params.set('limit', String(clamp(Number(limit) || 12, 1, 50)));

  const endpoint = `${META_CL_BASE_URL}/facebook/marketplace-listings/preview?${params.toString()}`;

  try {
    const response = await fetchWithTimeout(endpoint, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AutoIndexBot/1.0 (+https://autoindex.local)'
      }
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      res.status(response.status).json({
        error: payload?.error?.message || 'Failed to query Meta Content Library API.',
        details: payload?.error || null
      });
      return;
    }

    const nodes = Array.isArray(payload?.data) ? payload.data : [];
    const buyerGeo = await geocodeUSZip(buyerZip);
    const listings = nodes.map((node) =>
      normalizeMarketplaceNode(node, normalizedCategory, normalizedCondition, buyerGeo)
    );

    res.json({
      source: 'Meta Content Library API',
      query: {
        q: query,
        categories: categories || [],
        listingCountries: listingCountries || ['US'],
        priceMin: priceMin ?? null,
        priceMax: priceMax ?? null,
        since: since ?? null,
        until: until ?? null,
        sort: sort ?? 'most_to_least_views'
      },
      count: listings.length,
      listings,
      paging: payload?.paging || null
    });
  } catch (error) {
    res.status(502).json({
      error: 'Unable to query Facebook Marketplace data at this time.',
      details: String(error?.message || error)
    });
  }
});

app.listen(PORT, async () => {
  await seedAdmin();
  console.log(`AutoIndex auth server listening on http://localhost:${PORT}`);
});
