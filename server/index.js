import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import Stripe from 'stripe';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
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
const PASSWORD_MIN_LENGTH = Number(process.env.PASSWORD_MIN_LENGTH || 10);
const TOKEN_TTL = '7d';
const EMAIL_VERIFY_TOKEN_TTL_HOURS = Number(process.env.EMAIL_VERIFY_TOKEN_TTL_HOURS || 24);
const VERIFY_RESEND_COOLDOWN_MS = 60_000;
const APP_BASE_URL = process.env.APP_BASE_URL || (PROD ? 'https://kdubz-cyber.github.io/autoindex/' : 'http://localhost:5173');
const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@autoindex.app';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const USERS_PATH = path.join(__dirname, 'data', 'users.json');
const PAYMENTS_PATH = path.join(__dirname, 'data', 'payments.json');
const HTTP_TIMEOUT_MS = 7000;
const PLATFORM_FEE_RATE = Number(process.env.PLATFORM_FEE_RATE || 0.03);
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';
const COOKIE_SAME_SITE_RAW = String(process.env.COOKIE_SAME_SITE || (PROD ? 'none' : 'lax')).toLowerCase();
const COOKIE_SAME_SITE =
  COOKIE_SAME_SITE_RAW === 'strict'
    ? 'strict'
    : COOKIE_SAME_SITE_RAW === 'none'
      ? 'none'
      : 'lax';
const COOKIE_SECURE =
  String(process.env.COOKIE_SECURE || (PROD || COOKIE_SAME_SITE === 'none')).toLowerCase() === 'true';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || '';
const META_CL_BASE_URL = process.env.META_CL_BASE_URL || 'https://graph.facebook.com/v22.0';
const META_CL_ACCESS_TOKEN = process.env.META_CL_ACCESS_TOKEN || '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean);

const app = express();
const mailTransport = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
    })
  : null;
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia'
    })
  : null;

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

const RARITY_FACTOR_TABLE = {
  readily_available: { factor: 1.0, label: 'Readily Available Everywhere' },
  limited_production: { factor: 1.1, label: 'Limited Production' },
  backordered_3_plus: { factor: 1.15, label: 'Backordered 3+ Months' },
  discontinued: { factor: 1.25, label: 'Discontinued' },
  rare_jdm_nla: { factor: 1.4, label: 'Rare / JDM / NLA' }
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

function normalizeEmail(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase();
}

function isValidEmail(raw) {
  const email = normalizeEmail(raw);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) return false;
  return /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

function hashVerificationToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

function timingSafeEqualHex(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  if (left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function createVerificationToken() {
  const token = randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: hashVerificationToken(token),
    expiresAt: Date.now() + EMAIL_VERIFY_TOKEN_TTL_HOURS * 60 * 60 * 1000
  };
}

function buildVerificationUrl(email, token) {
  try {
    const u = new URL(APP_BASE_URL);
    u.searchParams.set('verify_email', email);
    u.searchParams.set('verify_token', token);
    return u.toString();
  } catch {
    const base = APP_BASE_URL.endsWith('/') ? APP_BASE_URL : `${APP_BASE_URL}/`;
    return `${base}?verify_email=${encodeURIComponent(email)}&verify_token=${encodeURIComponent(token)}`;
  }
}

async function sendVerificationEmail({ email, username, token }) {
  const verifyUrl = buildVerificationUrl(email, token);
  const text = [
    `Hi ${username},`,
    '',
    'Verify your AutoIndex account by clicking the link below:',
    verifyUrl,
    '',
    `This link expires in ${EMAIL_VERIFY_TOKEN_TTL_HOURS} hours.`
  ].join('\n');
  const html = [
    `<p>Hi ${username},</p>`,
    '<p>Verify your AutoIndex account by clicking the link below:</p>',
    `<p><a href="${verifyUrl}">Verify your account</a></p>`,
    `<p>This link expires in ${EMAIL_VERIFY_TOKEN_TTL_HOURS} hours.</p>`
  ].join('');

  if (!mailTransport) {
    console.log(`[AutoIndex] Email transport not configured. Verification link for ${email}: ${verifyUrl}`);
    return {
      sent: false,
      previewUrl: verifyUrl
    };
  }

  await mailTransport.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject: 'Verify your AutoIndex account',
    text,
    html
  });

  return {
    sent: true,
    previewUrl: null
  };
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

function parseDealerPriceInput(raw) {
  return parsePrice(raw);
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

function normalizeRarityProfile(raw) {
  if (raw == null) return 'auto';
  const normalized = String(raw).trim().toLowerCase().replace(/[\s/-]+/g, '_');
  if (normalized in RARITY_FACTOR_TABLE) return normalized;
  return 'auto';
}

function inferRarityProfileFromText(sourceText = '') {
  const t = String(sourceText).toLowerCase();
  if (/rare|jdm|nla|hard\s*to\s*find|collector/.test(t)) return 'rare_jdm_nla';
  if (/discontinued|no\s*longer\s*available/.test(t)) return 'discontinued';
  if (/backorder|backordered|3\+\s*months?/.test(t)) return 'backordered_3_plus';
  if (/limited|small\s*batch|low\s*production/.test(t)) return 'limited_production';
  return 'readily_available';
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  return sorted[mid];
}

function estimateDealerAnchorHeuristic({ askPrice, detectedPrice, category, condition }) {
  const baseByCategory = {
    Engine: 2200,
    Suspension: 900,
    Transmission: 1800,
    Brakes: 850,
    Rims: 950,
    Tires: 700,
    Exhaust: 780,
    Chassis: 620,
    Audio: 520
  };
  const baseline = askPrice ?? detectedPrice ?? baseByCategory[category] ?? 800;
  const uplift = condition === 'Used' ? 1.45 : condition === 'Aftermarket' ? 1.2 : 1.05;
  return Math.round(Math.max(baseline * uplift, (baseByCategory[category] ?? 800) * 0.7));
}

async function researchDealerAnchorAndRarity({
  title,
  category,
  condition,
  askPrice,
  detectedPrice
}) {
  let rarityProfile = inferRarityProfileFromText(title);
  let dealerOriginalPrice = null;
  let source = 'heuristic';

  try {
    const q = encodeURIComponent(`${title} ${category} OEM dealer MSRP price`);
    const res = await fetchWithTimeout(`https://duckduckgo.com/html/?q=${q}`, {
      headers: {
        'User-Agent': 'AutoIndexBot/1.0 (+https://autoindex.local)'
      }
    }, 5000);
    if (res.ok) {
      const html = await res.text();
      const text = htmlToText(html);
      const rarityFromSearch = inferRarityProfileFromText(`${title} ${text}`);
      if (rarityFromSearch) rarityProfile = rarityFromSearch;

      const prices = Array.from(text.matchAll(/\$\s*([0-9]{2,5}(?:\.[0-9]{1,2})?)/g))
        .map((m) => Number(m[1]))
        .filter((n) => Number.isFinite(n) && n >= 50 && n <= 20000);
      const filtered = prices.filter((n) => askPrice == null || n >= askPrice * 0.6);
      const med = median(filtered.length ? filtered : prices);
      if (med != null) {
        dealerOriginalPrice = med;
        source = 'web';
      }
    }
  } catch {
    // fall through to heuristic
  }

  if (dealerOriginalPrice == null) {
    dealerOriginalPrice = estimateDealerAnchorHeuristic({
      askPrice,
      detectedPrice,
      category,
      condition
    });
  }

  return {
    dealerOriginalPrice,
    rarityProfile,
    source
  };
}

function availabilityFactor({ rarityProfile = 'auto', sourceText = '', isMarketplaceLink = false }) {
  const normalized = normalizeRarityProfile(rarityProfile);
  const key =
    normalized === 'auto' ? inferRarityProfileFromText(sourceText) : normalized;
  const row = RARITY_FACTOR_TABLE[key] || RARITY_FACTOR_TABLE.readily_available;
  return {
    key,
    factor: row.factor,
    label: row.label,
    inferred: normalized === 'auto',
    isMarketplaceLink
  };
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

function valuationConfidenceNorm({
  sourceFetched,
  hasPrice,
  hasTitle,
  hasBuyerGeo,
  hasDealerAnchor = false
}) {
  let score = 0.55;
  if (sourceFetched) score += 0.2;
  if (hasPrice) score += 0.15;
  if (hasTitle) score += 0.05;
  if (hasBuyerGeo) score += 0.05;
  if (hasDealerAnchor) score += 0.1;
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
  rarityProfile,
  dealerOriginalPrice,
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
  const normalizedDealerPrice = parseDealerPriceInput(dealerOriginalPrice);
  const availability = availabilityFactor({
    rarityProfile,
    sourceText: title,
    isMarketplaceLink: isMarketplaceSource
  });
  const af = ageFactor(inferredPartType, inferAgeBand(title, condition, partYear));
  const cf = Math.round(
    conditionFactor(condition) * engineMileageFactor(category, condition, normalizedEngineMiles) * 1000
  ) / 1000;
  const avf = availability.factor;
  const mdf = demandFactor(category);
  const baseAnchor = Math.max(normalizedDealerPrice ?? price ?? 300, 50);
  const fmv = Math.round(baseAnchor * af * cf * avf * mdf);
  const spread = avf >= 1.25 ? { low: 0.85, high: 1.22 } : { low: 0.88, high: 1.18 };
  const marketRange = {
    low: Math.round(fmv * spread.low),
    mid: fmv,
    high: Math.round(fmv * spread.high)
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
    hasBuyerGeo,
    hasDealerAnchor: normalizedDealerPrice != null
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
  if (price != null && normalizedDealerPrice != null && price > normalizedDealerPrice * 1.15) {
    if (avf <= 1.1) {
      riskFlags.push('Ask price is above original dealer/MSRP without strong rarity support.');
    } else {
      riskFlags.push('Ask price exceeds original dealer/MSRP; rarity may justify premium, verify details.');
    }
  }
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
        availabilityKey: availability.key,
        marketDemandFactor: mdf,
        dealerOriginalPrice: normalizedDealerPrice
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

function ensurePaymentsFile() {
  if (!fs.existsSync(path.dirname(PAYMENTS_PATH))) {
    fs.mkdirSync(path.dirname(PAYMENTS_PATH), { recursive: true });
  }
  if (!fs.existsSync(PAYMENTS_PATH)) {
    fs.writeFileSync(PAYMENTS_PATH, JSON.stringify({ sessions: [], orders: [] }, null, 2));
  }
}

function readPaymentsStore() {
  ensurePaymentsFile();
  try {
    const raw = fs.readFileSync(PAYMENTS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : []
    };
  } catch {
    return { sessions: [], orders: [] };
  }
}

function writePaymentsStore(store) {
  fs.writeFileSync(PAYMENTS_PATH, JSON.stringify(store, null, 2));
}

function roundCurrency(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function dollarsToCents(amount) {
  return Math.round(Number(amount || 0) * 100);
}

function centsToDollars(cents) {
  return Math.round(Number(cents || 0)) / 100;
}

function sanitizeSellerType(raw) {
  return raw === 'individual' ? 'individual' : 'vendor';
}

function normalizeCheckoutItems(rawItems = []) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map((item) => {
      const amount = roundCurrency(item?.price);
      if (!Number.isFinite(amount) || amount <= 0) return null;
      const listingTitle = String(item?.listingTitle || item?.title || '').trim();
      const listingId = String(item?.listingId || '').trim();
      const sellerId = String(item?.sellerId || '').trim();
      const sellerName = String(item?.sellerName || '').trim() || 'Seller';
      if (!listingTitle || !listingId || !sellerId) return null;
      return {
        listingId,
        listingTitle,
        sellerType: sanitizeSellerType(item?.sellerType),
        sellerId,
        sellerName,
        amount
      };
    })
    .filter(Boolean);
}

function allocateFeeCentsAcrossItems(items, totalFeeCents) {
  if (!items.length || totalFeeCents <= 0) {
    return items.map(() => 0);
  }
  const grossTotal = items.reduce((sum, item) => sum + dollarsToCents(item.amount), 0);
  if (!grossTotal) return items.map(() => 0);

  const allocations = items.map((item) => Math.floor((dollarsToCents(item.amount) / grossTotal) * totalFeeCents));
  let allocated = allocations.reduce((sum, v) => sum + v, 0);
  let idx = 0;
  while (allocated < totalFeeCents) {
    allocations[idx % allocations.length] += 1;
    allocated += 1;
    idx += 1;
  }
  return allocations;
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
    email: null,
    passwordHash,
    role: 'admin',
    emailVerified: true,
    emailVerifiedAt: Date.now(),
    emailVerificationTokenHash: null,
    emailVerificationExpiresAt: null,
    emailVerificationSentAt: null,
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
  const cookie = {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAME_SITE,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    value: token
  };
  if (COOKIE_DOMAIN) cookie.domain = COOKIE_DOMAIN;
  return cookie;
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email || undefined,
    emailVerified: Boolean(user.emailVerified),
    role: user.role,
    vendorId: user.vendorId || undefined,
    vendorName: user.vendorName || undefined,
    vendorLocation: user.vendorLocation || undefined
  };
}

function sanitizeOrder(order) {
  return {
    id: order.id,
    ts: order.ts,
    sellerType: order.sellerType,
    sellerId: order.sellerId,
    sellerName: order.sellerName,
    amount: roundCurrency(order.amount),
    grossAmount: roundCurrency(order.grossAmount ?? order.amount),
    platformFeeAmount: roundCurrency(order.platformFeeAmount),
    sellerNetAmount: roundCurrency(order.sellerNetAmount),
    buyerId: order.buyerId,
    buyerRole: order.buyerRole,
    listingId: order.listingId,
    listingTitle: order.listingTitle,
    paymentProvider: order.paymentProvider || 'stripe',
    paymentStatus: order.paymentStatus || 'paid',
    paymentSessionId: order.paymentSessionId || null
  };
}

function findUserByIdentifier(users, identifier) {
  const needle = String(identifier || '').trim().toLowerCase();
  if (!needle) return null;
  return (
    users.find((u) => typeof u.email === 'string' && u.email.toLowerCase() === needle) ||
    users.find((u) => u.username.toLowerCase() === needle) ||
    null
  );
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
    authRequiresEmailVerification: true,
    emailServiceConfigured: Boolean(mailTransport),
    paymentsConfigured: Boolean(stripe),
    platformFeeRate: PLATFORM_FEE_RATE,
    cookieSameSite: COOKIE_SAME_SITE,
    cookieSecure: COOKIE_SECURE,
    metaMarketplaceConfigured: Boolean(META_CL_ACCESS_TOKEN),
    allowedOrigins: ALLOWED_ORIGINS,
    apiVersion: '2026-02-27'
  });
});

app.get('/api/auth/me', authRequired, (req, res) => {
  const store = readStore();
  const user = store.users.find((u) => u.id === req.user.sub);
  if (!user) {
    const clearCookieOptions = {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAME_SITE,
      path: '/'
    };
    if (COOKIE_DOMAIN) clearCookieOptions.domain = COOKIE_DOMAIN;
    res.clearCookie('ai_session', clearCookieOptions);
    res.status(401).json({ error: 'Session user not found' });
    return;
  }
  res.json({ user: sanitizeUser(user) });
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, username, password, role, vendorName, vendorLocation } = req.body ?? {};
  const normalizedRole = role === 'vendor' ? 'vendor' : role === 'individual' ? 'individual' : null;
  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = String(username || '').trim();
  const fallbackUsername = normalizedEmail ? normalizedEmail.split('@')[0] : '';
  const accountUsername = normalizedUsername || fallbackUsername;

  if (!isValidEmail(normalizedEmail)) {
    res.status(400).json({ error: 'A valid email address is required' });
    return;
  }
  if (!accountUsername || accountUsername.length < 3) {
    res.status(400).json({ error: 'Username must be at least 3 characters' });
    return;
  }
  if (!isStrongPassword(password)) {
    res.status(400).json({
      error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include uppercase, lowercase, number, and symbol`
    });
    return;
  }
  if (!normalizedRole) {
    res.status(400).json({ error: 'Role must be individual or vendor' });
    return;
  }

  const store = readStore();
  const emailExists = store.users.some((u) => typeof u.email === 'string' && u.email.toLowerCase() === normalizedEmail);
  if (emailExists) {
    res.status(409).json({ error: 'Email already exists' });
    return;
  }
  const usernameExists = store.users.some((u) => u.username.toLowerCase() === accountUsername.toLowerCase());
  if (usernameExists) {
    res.status(409).json({ error: 'Username already exists' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const verification = createVerificationToken();
  const user = {
    id: randomUUID(),
    email: normalizedEmail,
    username: accountUsername,
    passwordHash,
    role: normalizedRole,
    emailVerified: false,
    emailVerifiedAt: null,
    emailVerificationTokenHash: verification.tokenHash,
    emailVerificationExpiresAt: verification.expiresAt,
    emailVerificationSentAt: Date.now(),
    vendorId: normalizedRole === 'vendor' ? `vx-${Date.now()}` : null,
    vendorName: normalizedRole === 'vendor' ? String(vendorName || `${accountUsername} Performance`) : null,
    vendorLocation: normalizedRole === 'vendor' ? String(vendorLocation || 'Unknown, USA') : null,
    createdAt: Date.now()
  };

  store.users.push(user);
  writeStore(store);

  let emailDelivery = { sent: false, previewUrl: null };
  try {
    emailDelivery = await sendVerificationEmail({
      email: normalizedEmail,
      username: accountUsername,
      token: verification.token
    });
  } catch (error) {
    console.error('Failed to send verification email:', error);
  }

  res.status(201).json({
    ok: true,
    requiresEmailVerification: true,
    verificationEmailSent: emailDelivery.sent,
    email: normalizedEmail,
    message: emailDelivery.sent
      ? 'Account created. Check your email to verify your account.'
      : 'Account created. Email service is not configured; verification link is available in server logs.',
    previewUrl: !PROD ? emailDelivery.previewUrl : undefined
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body ?? {};
  if (!identifier || !password) {
    res.status(400).json({ error: 'Email/username and password are required' });
    return;
  }

  const store = readStore();
  const user = findUserByIdentifier(store.users, identifier);
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  if (user.role !== 'admin') {
    if (!user.email) {
      res.status(403).json({
        error: 'Legacy account without email detected. Create a new account with a verified email.',
        code: 'EMAIL_REQUIRED'
      });
      return;
    }
    if (!user.emailVerified) {
      res.status(403).json({
        error: 'Email not verified. Check your inbox for a verification link.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email
      });
      return;
    }
  }

  const token = makeSessionToken(user);
  const cookie = sessionCookie(token);
  res.cookie('ai_session', cookie.value, cookie);
  res.json({ user: sanitizeUser(user) });
});

app.get('/api/auth/verify-email', (req, res) => {
  const token = String(req.query.token || '').trim();
  const email = normalizeEmail(req.query.email);
  if (!token || !isValidEmail(email)) {
    res.status(400).json({ error: 'Invalid verification link.' });
    return;
  }

  const store = readStore();
  const user = store.users.find((u) => typeof u.email === 'string' && u.email.toLowerCase() === email);
  if (!user) {
    res.status(400).json({ error: 'Invalid verification link.' });
    return;
  }
  if (user.emailVerified) {
    res.json({ ok: true, message: 'Email already verified. You can log in.' });
    return;
  }

  const tokenHash = hashVerificationToken(token);
  const expiresAt = Number(user.emailVerificationExpiresAt || 0);
  const storedHash = String(user.emailVerificationTokenHash || '');
  if (!storedHash || !expiresAt || Date.now() > expiresAt || !timingSafeEqualHex(storedHash, tokenHash)) {
    res.status(400).json({ error: 'Verification link is invalid or expired.' });
    return;
  }

  user.emailVerified = true;
  user.emailVerifiedAt = Date.now();
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpiresAt = null;
  user.emailVerificationSentAt = null;
  writeStore(store);

  res.json({ ok: true, message: 'Email verified. You can now log in.' });
});

app.post('/api/auth/resend-verification', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'A valid email address is required.' });
    return;
  }

  const store = readStore();
  const user = store.users.find((u) => typeof u.email === 'string' && u.email.toLowerCase() === email);
  if (!user) {
    res.json({ ok: true, message: 'If an account exists, a verification email has been sent.' });
    return;
  }
  if (user.role === 'admin') {
    res.status(400).json({ error: 'Admin account does not use email verification.' });
    return;
  }
  if (user.emailVerified) {
    res.json({ ok: true, message: 'Email already verified. You can log in.' });
    return;
  }

  const lastSent = Number(user.emailVerificationSentAt || 0);
  if (lastSent && Date.now() - lastSent < VERIFY_RESEND_COOLDOWN_MS) {
    res.status(429).json({ error: 'Please wait one minute before requesting another verification email.' });
    return;
  }

  const verification = createVerificationToken();
  user.emailVerificationTokenHash = verification.tokenHash;
  user.emailVerificationExpiresAt = verification.expiresAt;
  user.emailVerificationSentAt = Date.now();
  writeStore(store);

  let emailDelivery = { sent: false, previewUrl: null };
  try {
    emailDelivery = await sendVerificationEmail({
      email,
      username: user.username,
      token: verification.token
    });
  } catch (error) {
    console.error('Failed to resend verification email:', error);
  }

  res.json({
    ok: true,
    verificationEmailSent: emailDelivery.sent,
    message: emailDelivery.sent
      ? 'Verification email sent. Check your inbox.'
      : 'Email service is not configured; verification link is available in server logs.',
    previewUrl: !PROD ? emailDelivery.previewUrl : undefined
  });
});

app.post('/api/auth/logout', (_, res) => {
  const clearCookieOptions = {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAME_SITE,
    path: '/'
  };
  if (COOKIE_DOMAIN) clearCookieOptions.domain = COOKIE_DOMAIN;
  res.clearCookie('ai_session', clearCookieOptions);
  res.json({ ok: true });
});

app.get('/api/payments/config', (_, res) => {
  res.json({
    ok: true,
    provider: 'stripe',
    configured: Boolean(stripe),
    publishableKey: STRIPE_PUBLISHABLE_KEY || null,
    googlePayAvailability: 'Google Pay is shown by Stripe Checkout when browser/device/domain are eligible.',
    platformFeeRate: PLATFORM_FEE_RATE
  });
});

app.get('/api/payments/orders', authRequired, (req, res) => {
  const paymentsStore = readPaymentsStore();
  const userRole = req.user.role;
  let scoped = paymentsStore.orders;

  if (userRole === 'admin') {
    scoped = paymentsStore.orders;
  } else if (userRole === 'vendor') {
    const store = readStore();
    const me = store.users.find((u) => u.id === req.user.sub);
    const vendorId = me?.vendorId || req.user.vendorId || null;
    scoped = vendorId
      ? paymentsStore.orders.filter((o) => o.sellerType === 'vendor' && o.sellerId === vendorId)
      : [];
  } else {
    scoped = paymentsStore.orders.filter((o) => o.buyerId === req.user.sub || o.sellerId === req.user.sub);
  }

  const ordered = [...scoped].sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0)).map(sanitizeOrder);
  res.json({ orders: ordered });
});

app.post('/api/payments/create-checkout-session', authRequired, async (req, res) => {
  if (!stripe) {
    res.status(503).json({ error: 'Stripe is not configured on this backend.' });
    return;
  }
  if (req.user.role !== 'individual') {
    res.status(403).json({ error: 'Only Individual Users can checkout.' });
    return;
  }

  const items = normalizeCheckoutItems(req.body?.items);
  if (!items.length) {
    res.status(400).json({ error: 'Cart is empty or invalid.' });
    return;
  }

  const grossCents = items.reduce((sum, item) => sum + dollarsToCents(item.amount), 0);
  const platformFeeCents = Math.max(0, Math.round(grossCents * PLATFORM_FEE_RATE));
  const sellerNetCents = Math.max(0, grossCents - platformFeeCents);
  const pendingOrderId = randomUUID();
  const baseUrl = APP_BASE_URL.endsWith('/') ? APP_BASE_URL.slice(0, -1) : APP_BASE_URL;

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${baseUrl}?checkout_success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}?checkout_canceled=1`,
      allow_promotion_codes: false,
      billing_address_collection: 'auto',
      line_items: items.map((item) => ({
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: dollarsToCents(item.amount),
          product_data: {
            name: item.listingTitle
          }
        }
      })),
      metadata: {
        pendingOrderId,
        buyerId: req.user.sub,
        buyerRole: req.user.role,
        platformFeeCents: String(platformFeeCents),
        platformFeeRate: String(PLATFORM_FEE_RATE)
      }
    });

    const paymentsStore = readPaymentsStore();
    paymentsStore.sessions.push({
      id: pendingOrderId,
      sessionId: checkoutSession.id,
      buyerId: req.user.sub,
      buyerRole: req.user.role,
      grossAmount: centsToDollars(grossCents),
      platformFeeAmount: centsToDollars(platformFeeCents),
      sellerNetAmount: centsToDollars(sellerNetCents),
      items,
      status: 'pending',
      createdAt: Date.now(),
      completedAt: null
    });
    writePaymentsStore(paymentsStore);

    res.json({
      ok: true,
      provider: 'stripe',
      sessionId: checkoutSession.id,
      checkoutUrl: checkoutSession.url,
      grossAmount: centsToDollars(grossCents),
      platformFeeAmount: centsToDollars(platformFeeCents),
      sellerNetAmount: centsToDollars(sellerNetCents),
      platformFeeRate: PLATFORM_FEE_RATE
    });
  } catch (error) {
    res.status(502).json({ error: 'Unable to create checkout session.', details: String(error?.message || error) });
  }
});

app.post('/api/payments/confirm-checkout-session', authRequired, async (req, res) => {
  if (!stripe) {
    res.status(503).json({ error: 'Stripe is not configured on this backend.' });
    return;
  }
  const sessionId = String(req.body?.sessionId || '').trim();
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required.' });
    return;
  }

  const paymentsStore = readPaymentsStore();
  const pending = paymentsStore.sessions.find((s) => s.sessionId === sessionId);
  if (!pending) {
    res.status(404).json({ error: 'Checkout session not found.' });
    return;
  }
  if (req.user.role !== 'admin' && pending.buyerId !== req.user.sub) {
    res.status(403).json({ error: 'Not authorized for this checkout session.' });
    return;
  }

  if (pending.status === 'paid') {
    const existing = paymentsStore.orders
      .filter((o) => o.paymentSessionId === sessionId)
      .sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0))
      .map(sanitizeOrder);
    res.json({ ok: true, paid: true, orderCount: existing.length, orders: existing });
    return;
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = checkoutSession.payment_status === 'paid';
    if (!paid) {
      res.json({ ok: true, paid: false, paymentStatus: checkoutSession.payment_status });
      return;
    }

    const totalPlatformFeeCents = dollarsToCents(pending.platformFeeAmount);
    const allocations = allocateFeeCentsAcrossItems(pending.items, totalPlatformFeeCents);
    const createdAt = Date.now();
    const orders = pending.items.map((item, idx) => {
      const grossCents = dollarsToCents(item.amount);
      const feeCents = allocations[idx] ?? 0;
      const netCents = Math.max(0, grossCents - feeCents);
      return {
        id: `ord-${randomUUID()}`,
        paymentSessionId: sessionId,
        ts: createdAt,
        sellerType: item.sellerType,
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        amount: centsToDollars(grossCents),
        grossAmount: centsToDollars(grossCents),
        platformFeeAmount: centsToDollars(feeCents),
        sellerNetAmount: centsToDollars(netCents),
        buyerId: pending.buyerId,
        buyerRole: pending.buyerRole,
        listingId: item.listingId,
        listingTitle: item.listingTitle,
        paymentProvider: 'stripe',
        paymentStatus: 'paid'
      };
    });

    paymentsStore.orders.push(...orders);
    pending.status = 'paid';
    pending.completedAt = createdAt;
    pending.paymentIntentId = checkoutSession.payment_intent || null;
    writePaymentsStore(paymentsStore);

    res.json({
      ok: true,
      paid: true,
      provider: 'stripe',
      orderCount: orders.length,
      orders: orders.map(sanitizeOrder),
      grossAmount: roundCurrency(pending.grossAmount),
      platformFeeAmount: roundCurrency(pending.platformFeeAmount),
      sellerNetAmount: roundCurrency(pending.sellerNetAmount)
    });
  } catch (error) {
    res.status(502).json({ error: 'Unable to confirm checkout session.', details: String(error?.message || error) });
  }
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
  const enrichment = await researchDealerAnchorAndRarity({
    title: resolvedTitle,
    category,
    condition,
    askPrice: ask,
    detectedPrice: meta.price
  });
  const normalizedDealerPrice = parseDealerPriceInput(enrichment.dealerOriginalPrice);
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
  const availability = availabilityFactor({
    rarityProfile: enrichment.rarityProfile,
    sourceText: resolvedTitle,
    isMarketplaceLink: meta.platform === 'Facebook Marketplace'
  });
  const avf = availability.factor;
  const mdf = demandFactor(category);

  const baseAnchor = Math.max(normalizedDealerPrice ?? meta.price ?? ask ?? 300, 50);
  const fmv = Math.round(baseAnchor * af * cf * avf * mdf);
  const spread = avf >= 1.25 ? { low: 0.85, high: 1.22 } : { low: 0.88, high: 1.18 };
  const marketRange = {
    low: Math.round(fmv * spread.low),
    mid: fmv,
    high: Math.round(fmv * spread.high)
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
  if (enrichment.source !== 'web') {
    riskFlags.push('Dealer price/rarity used heuristic research due limited web signal coverage.');
  }
  if (sellerTenureMonths < 6) riskFlags.push('Seller presence appears relatively new.');
  if (distance > 90) riskFlags.push('Long pickup distance increases risk and friction.');
  if (priceSignal === 'Under market') riskFlags.push('Price is below market; verify authenticity and condition.');
  if (priceSignal === 'Over market') riskFlags.push('Ask price is above estimated FMV range.');
  if (comparedAsk != null && Math.abs(comparedAsk - marketRange.mid) / marketRange.mid > 0.35) {
    riskFlags.push('Ask price deviates significantly from FMV estimate.');
  }
  if (condition === 'Used') riskFlags.push('Used part: request serials, photos, and fitment proof.');
  if (comparedAsk != null && normalizedDealerPrice != null && comparedAsk > normalizedDealerPrice * 1.15) {
    if (avf <= 1.1) {
      riskFlags.push('Ask price is above original dealer/MSRP without strong rarity support.');
    } else {
      riskFlags.push('Ask price exceeds original dealer/MSRP; rarity may justify premium, verify details.');
    }
  }
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
    hasBuyerGeo: Boolean(buyerGeo),
    hasDealerAnchor: normalizedDealerPrice != null
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
      rarityProfile: availability.key,
      dealerOriginalPrice: normalizedDealerPrice,
      researchSource: enrichment.source,
      condition,
      category
    },
    valuation: {
      formula: {
        baseAnchor,
        ageFactor: af,
        conditionFactor: cf,
        availabilityFactor: avf,
        availabilityKey: availability.key,
        marketDemandFactor: mdf,
        dealerOriginalPrice: normalizedDealerPrice
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
