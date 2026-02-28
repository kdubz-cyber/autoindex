import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Heart,
  Info,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  Tag,
  TrendingUp,
  Truck,
  Wrench,
  X,
  ShoppingCart,
  ClipboardList,
  ExternalLink,
  User2,
  LogOut
} from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const HAS_API_BASE = Boolean(API_BASE_URL);

type Tab = 'Valuation' | 'Marketplace' | 'Vendors' | 'Learn' | 'Sell' | 'Dashboard';

const CATEGORIES = [
  'Engine',
  'Suspension',
  'Transmission',
  'Brakes',
  'Rims',
  'Tires',
  'Exhaust',
  'Chassis',
  'Audio'
] as const;

type Category = (typeof CATEGORIES)[number];
type Condition = 'New' | 'Used' | 'Aftermarket';
type ListingCondition = Condition;
type PartType = 'OEM' | 'Performance';
type AgeBandKey = 'new_0_1' | 'years_1_3' | 'years_3_7' | 'years_7_15' | 'years_15_plus';
type ConditionGradeKey = 'brand_new' | 'excellent_used' | 'good_used' | 'fair_used' | 'rough_used';
type AvailabilityKey =
  | 'readily_available'
  | 'limited_production'
  | 'backordered_3_plus'
  | 'discontinued'
  | 'rare_jdm_nla';
type DemandKey = 'low' | 'moderate' | 'high' | 'cult_track_proven';

type Listing = {
  id: string;
  title: string;
  category: Category;
  condition: ListingCondition;
  brand: string;
  fitment: string;
  price: number;
  msrp?: number;
  vendorId: string;
  ships: 'Free' | 'Paid';
  returns: boolean;
  rating: number;
  reviews: number;
  badge?: 'Top Seller' | 'Verified' | 'OEM';
  sellerType?: 'vendor' | 'individual';
  sellerUserId?: string;
  sellerName?: string;
};

type Vendor = {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviews: number;
  verified: boolean;
  fastShip: boolean;
};

type SavedValuation = {
  ts: number;
  year: string;
  make: string;
  model: string;
  zip: string;
  category: Category | 'All' | string;
  condition: string;
  range: { low: number; mid: number; high: number };
  formula?: {
    partType: PartType;
    baseAnchor: number;
    ageFactor: number;
    conditionFactor: number;
    availabilityFactor: number;
    marketDemandFactor: number;
  };
};

type UserRole = 'individual' | 'vendor' | 'admin';

type SessionUser = {
  id: string;
  username: string;
  role: UserRole;
  vendorId?: string;
  vendorName?: string;
  vendorLocation?: string;
};

type LocalAuthUser = SessionUser & {
  password: string;
};

type OrderRecord = {
  id: string;
  ts: number;
  sellerType: 'vendor' | 'individual';
  sellerId: string;
  sellerName: string;
  amount: number;
  buyerId: string;
  buyerRole: UserRole;
  listingId: string;
  listingTitle: string;
};

type VendorFeedback = {
  id: string;
  vendorId: string;
  vendorName: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  ts: number;
};

const MIN_PASSWORD_LENGTH = 8;
const LOCAL_AUTH_USERS_KEY = 'autoindex_local_auth_users';
const LOCAL_AUTH_SESSION_KEY = 'autoindex_local_auth_session';
const LOCAL_DEMO_ADMIN: LocalAuthUser = {
  id: 'local-admin',
  username: 'sino0491',
  password: 'Ktrill20!',
  role: 'admin'
};

const AUTO_INDEX_LOGO =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 90"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%23dc2626"/><stop offset="1" stop-color="%23991b1b"/></linearGradient></defs><rect x="0" y="0" width="420" height="90" rx="18" fill="url(%23g)"/><text x="210" y="58" text-anchor="middle" font-family="Arial,sans-serif" font-size="34" font-weight="800" fill="white">AutoIndex</text></svg>';

const VENDORS: Vendor[] = [
  {
    id: 'v1',
    name: 'Redline Parts Co.',
    location: 'Bridgeport, CT',
    rating: 4.8,
    reviews: 3421,
    verified: true,
    fastShip: true
  },
  {
    id: 'v2',
    name: 'OEM Direct Warehouse',
    location: 'Newark, NJ',
    rating: 4.6,
    reviews: 2110,
    verified: true,
    fastShip: false
  },
  {
    id: 'v3',
    name: 'Trackday Garage',
    location: 'Providence, RI',
    rating: 4.7,
    reviews: 988,
    verified: false,
    fastShip: true
  },
  {
    id: 'v4',
    name: 'AudioLab Motors',
    location: 'Boston, MA',
    rating: 4.5,
    reviews: 1203,
    verified: true,
    fastShip: true
  }
];

const MOCK_LISTINGS: Listing[] = [
  {
    id: 'l1',
    title: 'Brembo GT 6-Piston Front Brake Kit',
    category: 'Brakes',
    condition: 'Aftermarket',
    brand: 'Brembo',
    fitment: '2015–2021 WRX/STI',
    price: 2299,
    msrp: 2899,
    vendorId: 'v1',
    ships: 'Free',
    returns: true,
    rating: 4.9,
    reviews: 612,
    badge: 'Top Seller'
  },
  {
    id: 'l2',
    title: 'OEM Turbocharger Assembly',
    category: 'Engine',
    condition: 'Used',
    brand: 'OEM',
    fitment: '2012–2017 GTI',
    price: 580,
    msrp: 1299,
    vendorId: 'v2',
    ships: 'Paid',
    returns: false,
    rating: 4.4,
    reviews: 88,
    badge: 'OEM'
  },
  {
    id: 'l3',
    title: 'Coilover Kit (Street/Track)',
    category: 'Suspension',
    condition: 'Aftermarket',
    brand: 'BC Racing',
    fitment: '2008–2014 Evo X',
    price: 1199,
    msrp: 1499,
    vendorId: 'v3',
    ships: 'Free',
    returns: true,
    rating: 4.7,
    reviews: 204,
    badge: 'Verified'
  },
  {
    id: 'l4',
    title: '19" Forged Wheels Set (5x114.3)',
    category: 'Rims',
    condition: 'Used',
    brand: 'Enkei',
    fitment: 'Universal (verify offset)',
    price: 950,
    msrp: 1899,
    vendorId: 'v1',
    ships: 'Paid',
    returns: false,
    rating: 4.6,
    reviews: 51
  },
  {
    id: 'l5',
    title: 'Cat-back Exhaust (Stainless)',
    category: 'Exhaust',
    condition: 'Aftermarket',
    brand: 'Borla',
    fitment: '2016–2023 Civic',
    price: 699,
    msrp: 899,
    vendorId: 'v3',
    ships: 'Free',
    returns: true,
    rating: 4.8,
    reviews: 177
  },
  {
    id: 'l6',
    title: 'Android Auto Head Unit + Harness',
    category: 'Audio',
    condition: 'New',
    brand: 'Pioneer',
    fitment: '2010–2015 Tacoma',
    price: 449,
    msrp: 599,
    vendorId: 'v4',
    ships: 'Free',
    returns: true,
    rating: 4.5,
    reviews: 930,
    badge: 'Verified'
  }
];

const AGE_FACTORS: Array<{ key: AgeBandKey; label: string; oem: number; performance: number }> = [
  { key: 'new_0_1', label: 'Brand New (0–1 yr)', oem: 1.0, performance: 1.0 },
  { key: 'years_1_3', label: '1–3 Years', oem: 0.9, performance: 0.85 },
  { key: 'years_3_7', label: '3–7 Years', oem: 0.75, performance: 0.7 },
  { key: 'years_7_15', label: '7–15 Years', oem: 0.65, performance: 0.6 },
  { key: 'years_15_plus', label: '15+ Years', oem: 0.6, performance: 0.55 }
];

const CONDITION_FACTORS: Array<{ key: ConditionGradeKey; label: string; factor: number }> = [
  { key: 'brand_new', label: 'Brand new / sealed', factor: 1.0 },
  { key: 'excellent_used', label: 'Excellent used', factor: 0.75 },
  { key: 'good_used', label: 'Good used', factor: 0.65 },
  { key: 'fair_used', label: 'Fair used', factor: 0.55 },
  { key: 'rough_used', label: 'Rough used / core', factor: 0.4 }
];

const AVAILABILITY_FACTORS: Array<{ key: AvailabilityKey; label: string; factor: number }> = [
  { key: 'readily_available', label: 'Readily Available Everywhere', factor: 1.0 },
  { key: 'limited_production', label: 'Limited Production', factor: 1.1 },
  { key: 'backordered_3_plus', label: 'Backordered 3+ Months', factor: 1.15 },
  { key: 'discontinued', label: 'Discontinued', factor: 1.25 },
  { key: 'rare_jdm_nla', label: 'Rare / JDM / NLA', factor: 1.4 }
];

const MARKET_DEMAND_FACTORS: Array<{ key: DemandKey; label: string; factor: number }> = [
  { key: 'low', label: 'Low', factor: 0.85 },
  { key: 'moderate', label: 'Moderate', factor: 1.0 },
  { key: 'high', label: 'High', factor: 1.1 },
  { key: 'cult_track_proven', label: 'Cult / Track Proven', factor: 1.2 }
];


function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function smallHash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function scoreToLabel(score10: number) {
  if (score10 >= 8.5) {
    return {
      label: 'Excellent deal',
      tone: 'bg-emerald-50 text-emerald-900 border-emerald-200'
    };
  }
  if (score10 >= 7) {
    return { label: 'Good deal', tone: 'bg-lime-50 text-lime-900 border-lime-200' };
  }
  if (score10 >= 5.5) {
    return { label: 'Fair', tone: 'bg-amber-50 text-amber-900 border-amber-200' };
  }
  return {
    label: 'Proceed carefully',
    tone: 'bg-rose-50 text-rose-900 border-rose-200'
  };
}

type MarketplaceSearchResult = {
  id: string;
  title: string;
  url?: string | null;
  price?: number | null;
  valuation: {
    fairMarketValue: number;
    marketRange: { low: number; mid: number; high: number };
    priceSignal: string;
    formula?: {
      ageBand: AgeBandKey;
      ageFactor: number;
      conditionFactor: number;
      availabilityFactor: number;
      marketDemandFactor: number;
    };
  };
  intelligence: {
    score10: number;
    estimatedDistanceMiles: number;
    partReputation: { score5: number };
    riskFlags: string[];
  };
};

function inferAgeBandForMarketplace(condition: Condition, sourceText = ''): AgeBandKey {
  const t = sourceText.toLowerCase();
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

function ageFactorFromBand(partType: PartType, ageBand: AgeBandKey) {
  const row = AGE_FACTORS.find((x) => x.key === ageBand) ?? AGE_FACTORS[2]!;
  return partType === 'OEM' ? row.oem : row.performance;
}

function computeFmvFromInputs(
  baseAnchor: number,
  category: Category,
  condition: Condition,
  sourceText = ''
): MarketplaceSearchResult['valuation'] {
  const partType: PartType = condition === 'Aftermarket' ? 'Performance' : 'OEM';
  const ageBand = inferAgeBandForMarketplace(condition, sourceText);
  const af = ageFactorFromBand(partType, ageBand);
  const cf = condition === 'New' ? 1 : condition === 'Aftermarket' ? 0.75 : 0.65;
  const avf = 1.1;
  const demandMap: Record<Category, number> = {
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
  const mdf = demandMap[category];
  const fmv = Math.round(baseAnchor * af * cf * avf * mdf);
  const marketRange = {
    low: Math.round(fmv * 0.88),
    mid: fmv,
    high: Math.round(fmv * 1.18)
  };
  return {
    fairMarketValue: fmv,
    marketRange,
    priceSignal: 'At market',
    formula: {
      ageBand,
      ageFactor: af,
      conditionFactor: cf,
      availabilityFactor: avf,
      marketDemandFactor: mdf
    }
  };
}

function classifyPriceSignalFromRange(
  askPrice: number | null | undefined,
  marketRange: { low: number; mid: number; high: number }
) {
  if (askPrice == null) return 'At market';
  if (askPrice < marketRange.mid * 0.9) return 'Under market';
  if (askPrice > marketRange.mid * 1.1) return 'Over market';
  return 'At market';
}

function applyPriceDealPenalty(input: {
  score10: number;
  askPrice?: number | null;
  marketRange: { low: number; mid: number; high: number };
}) {
  if (input.askPrice == null || input.marketRange.mid <= 0) return input.score10;
  const ratio = input.askPrice / input.marketRange.mid;
  let adjusted = input.score10;

  if (ratio > 1) adjusted -= Math.min((ratio - 1) * 4.5, 3.5);
  if (input.askPrice > input.marketRange.high) adjusted = Math.min(adjusted, 4.8);
  if (ratio >= 1.35) adjusted = Math.min(adjusted, 3.8);
  if (ratio >= 1.6) adjusted = Math.min(adjusted, 2.8);

  return clamp(Math.round(adjusted * 10) / 10, 1, 10);
}

function compositeMarketplaceScore(input: {
  askPrice?: number | null;
  fairMarketValue: number;
  reputationScore5: number;
  sellerTenureMonths: number;
  distanceMiles: number;
  sourceFetched: boolean;
}): number {
  const repNorm = clamp((input.reputationScore5 - 3.5) / 1.5, 0, 1);
  const tenureNorm = clamp(input.sellerTenureMonths / 24, 0, 1);
  const distanceNorm = clamp(1 - input.distanceMiles / 220, 0, 1);
  const priceNorm =
    input.askPrice == null || input.fairMarketValue <= 0
      ? 0.62
      : clamp(1 - Math.abs(input.askPrice - input.fairMarketValue) / input.fairMarketValue, 0.2, 1);
  const confidenceNorm = clamp((input.sourceFetched ? 0.8 : 0.55) + (input.askPrice != null ? 0.15 : 0), 0.35, 1);
  const weighted =
    repNorm * 0.2 +
    tenureNorm * 0.14 +
    distanceNorm * 0.12 +
    priceNorm * 0.44 +
    confidenceNorm * 0.1;
  return Math.round(clamp(weighted, 0.1, 1) * 100) / 10;
}

function toFallbackSearchResults(input: {
  query: string;
  category: Category;
  condition: Condition;
  priceMin?: number;
  priceMax?: number;
}): MarketplaceSearchResult[] {
  const q = input.query.trim().toLowerCase();
  const filtered = MOCK_LISTINGS.filter((l) => {
    const queryHit =
      !q ||
      l.title.toLowerCase().includes(q) ||
      l.brand.toLowerCase().includes(q) ||
      l.fitment.toLowerCase().includes(q) ||
      l.category.toLowerCase().includes(q);
    const categoryHit = l.category === input.category;
    const conditionHit = l.condition === input.condition;
    const minHit = input.priceMin == null || l.price >= input.priceMin;
    const maxHit = input.priceMax == null || l.price <= input.priceMax;
    return queryHit && categoryHit && conditionHit && minHit && maxHit;
  });

  const pool = (filtered.length ? filtered : MOCK_LISTINGS.filter((l) => l.category === input.category)).slice(0, 8);

  return pool.map((l) => {
    const valuation = computeFmvFromInputs(l.msrp || l.price, l.category, l.condition, `${l.title} ${l.fitment}`);
    const sellerTenureMonths = 6 + (smallHash(`${l.id}-tenure`) % 60);
    const estimatedDistanceMiles = 15 + (smallHash(l.id) % 120);
    const rawScore = compositeMarketplaceScore({
      askPrice: l.price,
      fairMarketValue: valuation.fairMarketValue,
      reputationScore5: l.rating,
      sellerTenureMonths,
      distanceMiles: estimatedDistanceMiles,
      sourceFetched: false
    });
    const priceSignal = classifyPriceSignalFromRange(l.price, valuation.marketRange);
    const score10 = applyPriceDealPenalty({
      score10: rawScore,
      askPrice: l.price,
      marketRange: valuation.marketRange
    });

    return {
      id: `fallback-${l.id}`,
      title: `${l.title} (Demo signal)`,
      url: null,
      price: l.price,
      valuation: {
        ...valuation,
        priceSignal
      },
      intelligence: {
        score10,
        estimatedDistanceMiles,
        partReputation: { score5: l.rating },
        riskFlags: l.condition === 'Used' ? ['Used part: verify photos, serial, and fitment before purchase.'] : []
      }
    };
  });
}

function useLocalStorageState<T>(key: string, fallback: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState] as const;
}

function ensureLocalAuthUsers(): LocalAuthUser[] {
  try {
    const raw = localStorage.getItem(LOCAL_AUTH_USERS_KEY);
    const parsed = raw ? (JSON.parse(raw) as LocalAuthUser[]) : [];
    const users = Array.isArray(parsed) ? parsed : [];
    if (!users.some((u) => u.username.toLowerCase() === LOCAL_DEMO_ADMIN.username.toLowerCase())) {
      const next = [LOCAL_DEMO_ADMIN, ...users];
      localStorage.setItem(LOCAL_AUTH_USERS_KEY, JSON.stringify(next));
      return next;
    }
    return users;
  } catch {
    const seeded = [LOCAL_DEMO_ADMIN];
    localStorage.setItem(LOCAL_AUTH_USERS_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeLocalAuthUsers(users: LocalAuthUser[]) {
  localStorage.setItem(LOCAL_AUTH_USERS_KEY, JSON.stringify(users));
}

function readLocalSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(LOCAL_AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.id || !parsed?.username || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLocalSession(user: SessionUser | null) {
  if (!user) {
    localStorage.removeItem(LOCAL_AUTH_SESSION_KEY);
    return;
  }
  localStorage.setItem(LOCAL_AUTH_SESSION_KEY, JSON.stringify(user));
}

function SectionImage({ kind }: { kind: 'hero' | 'learn' | 'vendors' | Category }) {
  const map: Record<string, { t: string; s: string }> = {
    hero: {
      t: 'Value performance parts in seconds',
      s: 'New • Used • Aftermarket, with marketplace-grade filters'
    },
    learn: {
      t: 'Know what you are buying',
      s: 'Fitment, condition grading, and pricing comps explained'
    },
    vendors: {
      t: 'Sell through AutoIndex',
      s: 'Multi-vendor storefronts with trust & shipping signals'
    },
    Engine: { t: 'Engine', s: 'Turbos, intakes, fuel, cooling, internals' },
    Suspension: { t: 'Suspension', s: 'Coilovers, arms, bushings, alignment parts' },
    Transmission: { t: 'Transmission', s: 'Clutches, gearsets, diffs, mounts' },
    Brakes: { t: 'Brakes', s: 'Big brake kits, rotors, pads, lines' },
    Rims: { t: 'Rims', s: 'Wheels, offsets, lug patterns' },
    Tires: { t: 'Tires', s: 'Track, street, winter, sizing' },
    Exhaust: { t: 'Exhaust', s: 'Headers, downpipes, cat-back systems' },
    Chassis: { t: 'Chassis', s: 'Bracing, subframes, aero mounting' },
    Audio: { t: 'Audio', s: 'Head units, amps, speakers, DSP' }
  };

  const text = map[kind];

  return (
    <svg
      viewBox="0 0 800 450"
      className="h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={text.t}
    >
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ef4444" />
          <stop offset="0.55" stopColor="#111827" />
          <stop offset="1" stopColor="#0b1220" />
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#g)" />
      <g opacity="0.2" stroke="#ffffff">
        {Array.from({ length: 10 }).map((_, i) => (
          <path key={i} d={`M0 ${45 * i} H800`} />
        ))}
      </g>
      <text x="60" y="95" fill="#fff" fontSize="42" fontWeight="800" fontFamily="Arial, sans-serif">
        {text.t}
      </text>
      <text x="60" y="138" fill="#e5e7eb" fontSize="18" fontWeight="600" fontFamily="Arial, sans-serif">
        {text.s}
      </text>
      <path d="M60 250 C220 140, 380 340, 600 220" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="5" />
      <circle cx="60" cy="250" r="8" fill="#fff" />
      <circle cx="600" cy="220" r="8" fill="#fff" />
    </svg>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 shadow-sm">
      {children}
    </span>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-zinc-100">
        <Icon className="h-5 w-5 text-zinc-700" />
      </div>
      <div>
        <div className="text-xs font-semibold text-zinc-500">{label}</div>
        <div className="text-base font-extrabold text-zinc-900">{value}</div>
      </div>
    </div>
  );
}

function StarRow({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;

  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`Rating ${value.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full || (i === full && half);
        return (
          <Star
            key={i}
            className={`h-4 w-4 ${filled ? 'text-amber-500' : 'text-zinc-300'}`}
            fill={filled ? 'currentColor' : 'none'}
          />
        );
      })}
    </div>
  );
}

type DrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

function Drawer({ open, title, onClose, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onEsc);
    };
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-50 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <button
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-label="Close panel"
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-modal="true"
        role="dialog"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 p-4">
          <div className="text-base font-black">{title}</div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-zinc-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="h-[calc(100%-56px)] overflow-auto p-4">{children}</div>
      </aside>
    </div>
  );
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2400);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2">
      <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-extrabold text-zinc-900 shadow-lg">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        {msg}
      </div>
    </div>
  );
}

type ListingCardProps = {
  listing: Listing;
  vendor: Vendor | undefined;
  onSave: (id: string) => void;
  onCart: (id: string) => void;
  onOpen: (id: string) => void;
};

function ListingCard({ listing, vendor, onSave, onCart, onOpen }: ListingCardProps) {
  const deal = listing.msrp ? clamp(1 - listing.price / listing.msrp, 0, 0.9) : 0;
  const dealPct = Math.round(deal * 100);

  return (
    <div className="group overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <button className="block w-full text-left" onClick={() => onOpen(listing.id)}>
        <div className="aspect-[16/9] bg-zinc-100">
          <SectionImage kind={listing.category} />
        </div>
      </button>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-zinc-500">
              {listing.category} • {listing.condition} • {listing.brand}
            </div>
            <button onClick={() => onOpen(listing.id)} className="mt-1 text-left text-sm font-extrabold leading-snug text-zinc-900 hover:underline">
              {listing.title}
            </button>
            <div className="mt-1 text-xs text-zinc-600">{listing.fitment}</div>
          </div>
          {listing.badge ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-bold text-zinc-800">
              <BadgeCheck className="h-3.5 w-3.5" /> {listing.badge}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <div className="text-lg font-black text-zinc-900">{fmtMoney(listing.price)}</div>
            {listing.msrp ? (
              <div className="text-xs text-zinc-500">
                MSRP <span className="line-through">{fmtMoney(listing.msrp)}</span> •{' '}
                <span className="font-bold text-emerald-700">Save {dealPct}%</span>
              </div>
            ) : (
              <div className="text-xs text-zinc-500">Market priced</div>
            )}
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-2">
              <StarRow value={listing.rating} />
              <span className="text-xs font-black text-zinc-800">{listing.rating.toFixed(1)}</span>
              <span className="text-xs font-semibold text-zinc-500">({listing.reviews})</span>
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">
              {listing.sellerType === 'individual' ? `Individual: ${listing.sellerName ?? 'Seller'}` : vendor?.name}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Pill>
            <Truck className="mr-1 h-3.5 w-3.5" /> {listing.ships} ship
          </Pill>
          <Pill>
            <ShieldCheck className="mr-1 h-3.5 w-3.5" /> {listing.returns ? 'Returns' : 'Final sale'}
          </Pill>
          {vendor?.verified ? (
            <Pill>
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Verified vendor
            </Pill>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => onCart(listing.id)}
            className="rounded-2xl bg-zinc-900 py-2 text-sm font-extrabold text-white transition-colors hover:bg-zinc-800"
          >
            Add to cart
          </button>
          <button
            onClick={() => onSave(listing.id)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white py-2 text-sm font-extrabold text-zinc-900 transition-colors hover:bg-zinc-50"
          >
            <Heart className="h-4 w-4" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

function MarketplaceAnalysisPanel({ toast }: { toast: (msg: string) => void }) {
  const [link, setLink] = useState('');
  const [buyerZip, setBuyerZip] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('Engine');
  const [selectedCondition, setSelectedCondition] = useState<Condition>('Used');
  const [partTitle, setPartTitle] = useState('');
  const [askPrice, setAskPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPriceMin, setSearchPriceMin] = useState('');
  const [searchPriceMax, setSearchPriceMax] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<null | {
    ok: boolean;
    metaMarketplaceConfigured: boolean;
    mode: string;
  }>(null);
  const [searchResults, setSearchResults] = useState<
    MarketplaceSearchResult[]
  >([]);

  const [analysis, setAnalysis] = useState<null | {
    platform: 'Facebook Marketplace' | 'Unknown' | string;
    sourceFetched: boolean;
    listing: {
      title: string;
      askPrice?: number | null;
      detectedPrice?: number | null;
      locationText?: string | null;
    };
    valuation: {
      formula: {
        baseAnchor: number;
        ageFactor: number;
        conditionFactor: number;
        availabilityFactor: number;
        marketDemandFactor: number;
      };
      fairMarketValue: number;
      marketRange: { low: number; mid: number; high: number };
      priceSignal: 'Under market' | 'At market' | 'Over market' | string;
    };
    partCategory: Category;
    partCondition: Condition;
    sellerTenureMonths: number;
    estimatedDistanceMiles: number;
    partRating5: number;
    riskFlags: string[];
    score10: number;
  }>(null);

  const canAnalyse = link.trim().length > 10;
  const canSearch = searchQuery.trim().length > 1;

  useEffect(() => {
    if (!HAS_API_BASE) {
      setBackendStatus(null);
      return;
    }
    const loadStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/system/status`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        setBackendStatus({
          ok: Boolean(data?.ok),
          metaMarketplaceConfigured: Boolean(data?.metaMarketplaceConfigured),
          mode: String(data?.mode || 'unknown')
        });
      } catch {
        setBackendStatus(null);
      }
    };
    loadStatus();
  }, []);

  const run = async () => {
    if (!HAS_API_BASE) {
      const parsedAsk = Number(String(askPrice).replace(/[^0-9.]/g, ''));
      const fallbackBase = Number.isFinite(parsedAsk) && parsedAsk > 0 ? parsedAsk : 450 + CATEGORIES.indexOf(selectedCategory) * 35;
      const valuation = computeFmvFromInputs(
        fallbackBase,
        selectedCategory,
        selectedCondition,
        `${partTitle.trim()} ${link.trim()}`
      );
      const sellerTenureMonths = 4 + (smallHash(link) % 72);
      const estimatedDistanceMiles = 10 + (smallHash(`${buyerZip}|${link}`) % 140);
      const partRating5 = 3.8 + (smallHash(`${selectedCategory}|${partTitle}`) % 11) / 10;
      const normalizedAsk = Number.isFinite(parsedAsk) && parsedAsk > 0 ? parsedAsk : null;
      const fallbackRawScore = compositeMarketplaceScore({
        askPrice: normalizedAsk,
        fairMarketValue: valuation.fairMarketValue,
        reputationScore5: partRating5,
        sellerTenureMonths,
        distanceMiles: estimatedDistanceMiles,
        sourceFetched: false
      });
      const fallbackPriceSignal = classifyPriceSignalFromRange(normalizedAsk, valuation.marketRange);
      const fallbackScore = applyPriceDealPenalty({
        score10: fallbackRawScore,
        askPrice: normalizedAsk,
        marketRange: valuation.marketRange
      });
      const fallbackRiskFlags = [
        'Live listing metadata unavailable on static-host mode.',
        'Verify seller profile, photos, serial numbers, and fitment before payment.'
      ];
      if (fallbackPriceSignal === 'Over market') {
        fallbackRiskFlags.unshift('Ask price is above estimated FMV range. Negotiate or skip this listing.');
      }
      setAnalysis({
        platform: 'Facebook Marketplace',
        sourceFetched: false,
        listing: {
          title: partTitle.trim() || 'Marketplace listing',
          askPrice: normalizedAsk,
          detectedPrice: null,
          locationText: null
        },
        valuation: {
          formula: {
            baseAnchor: fallbackBase,
            ageFactor: valuation.formula?.ageFactor ?? 0.75,
            conditionFactor: valuation.formula?.conditionFactor ?? 0.65,
            availabilityFactor: valuation.formula?.availabilityFactor ?? 1.1,
            marketDemandFactor: valuation.formula?.marketDemandFactor ?? 1
          },
          fairMarketValue: valuation.fairMarketValue,
          marketRange: valuation.marketRange,
          priceSignal: fallbackPriceSignal
        },
        partCategory: selectedCategory,
        partCondition: selectedCondition,
        sellerTenureMonths,
        estimatedDistanceMiles,
        partRating5,
        riskFlags: fallbackRiskFlags,
        score10: clamp(fallbackScore, 1, 10)
      });
      setApiError(null);
      toast('Analysis complete (demo mode)');
      return;
    }

    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/market-intelligence/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: link.trim(),
          buyerZip: buyerZip.trim(),
          partCategory: selectedCategory,
          partCondition: selectedCondition,
          partTitle: partTitle.trim(),
          askPrice: askPrice.trim()
        })
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};
      if (!res.ok) {
        setApiError(data?.error ?? 'Failed to analyze listing');
        return;
      }
      setAnalysis({
        platform: data.platform,
        sourceFetched: Boolean(data.sourceFetched),
        listing: {
          title: data.listing?.title ?? (partTitle.trim() || 'Unknown part'),
          askPrice: data.listing?.askPrice ?? null,
          detectedPrice: data.listing?.detectedPrice ?? null,
          locationText: data.listing?.locationText ?? null
        },
        valuation: {
          formula: {
            baseAnchor: data.valuation?.formula?.baseAnchor ?? 0,
            ageFactor: data.valuation?.formula?.ageFactor ?? 0,
            conditionFactor: data.valuation?.formula?.conditionFactor ?? 0,
            availabilityFactor: data.valuation?.formula?.availabilityFactor ?? 0,
            marketDemandFactor: data.valuation?.formula?.marketDemandFactor ?? 0
          },
          fairMarketValue: data.valuation?.fairMarketValue ?? 0,
          marketRange: data.valuation?.marketRange ?? { low: 0, mid: 0, high: 0 },
          priceSignal: data.valuation?.priceSignal ?? 'At market'
        },
        partCategory: selectedCategory,
        partCondition: selectedCondition,
        sellerTenureMonths: data.intelligence?.sellerTenureMonths ?? 0,
        estimatedDistanceMiles: data.intelligence?.estimatedDistanceMiles ?? 0,
        partRating5: data.intelligence?.partReputation?.score5 ?? 0,
        riskFlags: data.intelligence?.riskFlags ?? [],
        score10: data.intelligence?.score10 ?? 0
      });
      toast('Marketplace analysis complete');
    } catch {
      setApiError(
        'Could not reach intelligence service. On GitHub Pages, set VITE_API_BASE_URL to a deployed backend.'
      );
    } finally {
      setLoading(false);
    }
  };

  const runFacebookSearch = async () => {
    const parsedMin = Number(searchPriceMin);
    const parsedMax = Number(searchPriceMax);
    const min = searchPriceMin.trim() && Number.isFinite(parsedMin) ? parsedMin : undefined;
    const max = searchPriceMax.trim() && Number.isFinite(parsedMax) ? parsedMax : undefined;

    if (!HAS_API_BASE) {
      const fallbackResults = toFallbackSearchResults({
        query: searchQuery,
        category: selectedCategory,
        condition: selectedCondition,
        priceMin: min,
        priceMax: max
      });
      setSearchResults(fallbackResults);
      setSearchError(null);
      toast(`Loaded ${fallbackResults.length} marketplace results (demo mode)`);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/market-intelligence/search-facebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: searchQuery.trim(),
          categories: [selectedCategory],
          listingCountries: ['US'],
          priceMin: min,
          priceMax: max,
          sort: 'newest_to_oldest',
          partCategory: selectedCategory,
          partCondition: selectedCondition,
          buyerZip: buyerZip.trim(),
          limit: 12
        })
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};
      if (!res.ok) {
        setSearchError(
          data?.error ??
            `Marketplace search failed (${res.status}). Ensure backend has META_CL_ACCESS_TOKEN configured.`
        );
        setSearchResults([]);
        return;
      }
      setSearchResults(Array.isArray(data?.listings) ? data.listings : []);
      toast(`Loaded ${Array.isArray(data?.listings) ? data.listings.length : 0} marketplace results`);
    } catch {
      setSearchError(
        'Unable to search marketplace right now. On GitHub Pages, configure VITE_API_BASE_URL to your backend.'
      );
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const label = analysis ? scoreToLabel(analysis.score10) : null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm lg:col-span-2">
        <div className="aspect-[16/9] bg-zinc-100">
          <SectionImage kind="hero" />
        </div>
        <div className="p-5">
          {backendStatus?.ok && !backendStatus.metaMarketplaceConfigured ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Backend is online, but Facebook Marketplace API token is not configured (`META_CL_ACCESS_TOKEN` missing).
            </div>
          ) : null}
          {!backendStatus ? (
            <div className="mb-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
              Running in demo mode on GitHub Pages. Marketplace analysis/search uses local fallback signals until
              backend API is connected.
            </div>
          ) : null}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-zinc-500">Marketplace Analysis</div>
              <div className="mt-1 text-xl font-black text-zinc-900">Verify a Facebook Marketplace listing before you buy</div>
              <div className="mt-2 text-sm text-zinc-600">
                Paste a Facebook Marketplace listing URL, select condition/category, and AutoIndex will fetch listing
                metadata (where permitted), estimate distance via geocoding, and rate fair market value from real signals.
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-extrabold text-zinc-800">
              <Sparkles className="h-4 w-4" /> Intelligence Engine
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-zinc-600">Part category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as Category)}
                className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-600">Part condition</label>
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value as Condition)}
                className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
              >
                <option value="Used">Used</option>
                <option value="Aftermarket">Aftermarket</option>
                <option value="New">New</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-600">Part title (optional)</label>
              <div className="mt-1 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2">
                <Wrench className="h-4 w-4 text-zinc-500" />
                <input
                  value={partTitle}
                  onChange={(e) => setPartTitle(e.target.value)}
                  placeholder="e.g., Garrett GTX3076R turbo"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-600">Ask price (optional)</label>
              <div className="mt-1 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2">
                <Tag className="h-4 w-4 text-zinc-500" />
                <input
                  value={askPrice}
                  onChange={(e) => setAskPrice(e.target.value)}
                  placeholder="$750"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-zinc-600">Facebook Marketplace link</label>
              <div className="mt-1 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2">
                <ExternalLink className="h-4 w-4 text-zinc-500" />
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://www.facebook.com/marketplace/item/..."
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
              <div className="mt-2 inline-flex items-center gap-2 text-[12px] text-zinc-500">
                <Info className="h-4 w-4" /> AutoIndex fetches public metadata only where permitted.
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-600">Buyer ZIP (optional)</label>
              <div className="mt-1 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2">
                <MapPin className="h-4 w-4 text-zinc-500" />
                <input
                  value={buyerZip}
                  onChange={(e) => setBuyerZip(e.target.value)}
                  placeholder="06770"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              disabled={!canAnalyse || loading}
              onClick={run}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-extrabold text-white transition-colors ${
                canAnalyse && !loading ? 'bg-zinc-900 hover:bg-zinc-800' : 'cursor-not-allowed bg-zinc-300'
              }`}
            >
              {loading ? 'Analyzing...' : 'Run analysis'} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {apiError ? <div className="mt-3 text-sm font-semibold text-rose-700">{apiError}</div> : null}

          {analysis ? (
            <div className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-zinc-500">Results</div>
                  <div className="mt-1 text-lg font-black text-zinc-900">
                    {analysis.partCategory} • {analysis.partCondition} • {analysis.platform}
                  </div>
                  {analysis.listing.title ? (
                    <div className="mt-1 text-sm font-semibold text-zinc-700">{analysis.listing.title}</div>
                  ) : null}
                  {typeof analysis.listing.askPrice === 'number' ? (
                    <div className="mt-1 text-xs text-zinc-600">
                      Ask price: <span className="font-black">{fmtMoney(analysis.listing.askPrice)}</span>
                    </div>
                  ) : null}
                  {!analysis.sourceFetched ? (
                    <div className="mt-1 text-xs text-amber-700">
                      Live listing metadata unavailable. AutoIndex used fallback valuation logic.
                    </div>
                  ) : null}
                </div>
                <div className={`rounded-2xl border px-3 py-2 text-right ${label?.tone ?? 'border-zinc-200'}`}>
                  <div className="text-xs font-extrabold">Score</div>
                  <div className="text-2xl font-black">{analysis.score10.toFixed(1)}/10</div>
                  <div className="text-xs font-bold">{label?.label}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <Stat icon={Building2} label="Seller tenure" value={`${analysis.sellerTenureMonths} months`} />
                <Stat icon={MapPin} label="Estimated distance" value={`${analysis.estimatedDistanceMiles} mi`} />
                <Stat icon={Star} label="Part reputation" value={`${analysis.partRating5.toFixed(1)}/5`} />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-extrabold text-zinc-800">
                  <Tag className="h-4 w-4" /> Price signal: {analysis.valuation.priceSignal}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-extrabold text-zinc-800">
                  <TrendingUp className="h-4 w-4" /> Est. market: {fmtMoney(analysis.valuation.marketRange.low)}–
                  {fmtMoney(analysis.valuation.marketRange.high)}
                </span>
                {buyerZip ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-extrabold text-zinc-800">
                    <MapPin className="h-4 w-4" /> Buyer ZIP: {buyerZip}
                  </span>
                ) : null}
                {analysis.listing.locationText ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-extrabold text-zinc-800">
                    <MapPin className="h-4 w-4" /> Listing area: {analysis.listing.locationText}
                  </span>
                ) : null}
              </div>
              <div className="mt-4">
                <div className="text-xs font-black text-zinc-900">Risk and verification checklist</div>
                <ul className="mt-2 space-y-2">
                  {analysis.riskFlags.map((f, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-zinc-700">
                      <Info className="mt-0.5 h-4 w-4 text-zinc-500" />
                      <span>{f}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2 text-sm text-zinc-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" />
                    <span>Ask for clear photos, serial numbers, and fitment confirmation before paying.</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : null}

          <div className="mt-6 rounded-3xl border border-zinc-200 bg-white p-4">
            <div className="text-xs font-bold text-zinc-500">Facebook Marketplace Search</div>
            <div className="mt-1 text-lg font-black text-zinc-900">Search listings and rate FMV at scale</div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-zinc-600">Search keywords</label>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                  placeholder="e.g., brembo brakes civic si"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-600">Condition profile</label>
                <div className="mt-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700">
                  {selectedCondition}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-600">Min price (USD)</label>
                <input
                  value={searchPriceMin}
                  onChange={(e) => setSearchPriceMin(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                  placeholder="100"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-600">Max price (USD)</label>
                <input
                  value={searchPriceMax}
                  onChange={(e) => setSearchPriceMax(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                  placeholder="1500"
                />
              </div>
              <div className="flex items-end">
                <button
                  disabled={!canSearch || searchLoading}
                  onClick={runFacebookSearch}
                  className={`w-full rounded-2xl px-4 py-2 text-sm font-extrabold text-white ${
                    canSearch && !searchLoading ? 'bg-zinc-900 hover:bg-zinc-800' : 'cursor-not-allowed bg-zinc-300'
                  }`}
                >
                  {searchLoading ? 'Searching...' : 'Search Marketplace'}
                </button>
              </div>
            </div>
            {searchError ? <div className="mt-3 text-sm font-semibold text-rose-700">{searchError}</div> : null}
            {searchResults.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-3">
                {searchResults.map((item) => {
                  const rowLabel = scoreToLabel(item.intelligence.score10);
                  return (
                    <div key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-zinc-900">{item.title}</div>
                          <div className="mt-1 text-xs font-semibold text-zinc-600">
                            Ask: {item.price ? fmtMoney(item.price) : 'Unknown'} • FMV:{' '}
                            {fmtMoney(item.valuation.fairMarketValue)} • {item.valuation.priceSignal}
                          </div>
                        </div>
                        <div className={`rounded-xl border px-2 py-1 text-right ${rowLabel.tone}`}>
                          <div className="text-xs font-extrabold">Score</div>
                          <div className="text-lg font-black">{item.intelligence.score10.toFixed(1)}</div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-zinc-700">
                        Market range: {fmtMoney(item.valuation.marketRange.low)}–{fmtMoney(item.valuation.marketRange.high)} • Distance:{' '}
                        {item.intelligence.estimatedDistanceMiles} mi • Reputation: {item.intelligence.partReputation.score5.toFixed(1)}/5
                      </div>
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-zinc-800 underline"
                        >
                          Open source listing <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                      {item.intelligence.riskFlags.length ? (
                        <ul className="mt-2 space-y-1">
                          {item.intelligence.riskFlags.slice(0, 2).map((flag, idx) => (
                            <li key={idx} className="text-xs text-zinc-700">
                              • {flag}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="aspect-[16/10] bg-zinc-100">
          <SectionImage kind="learn" />
        </div>
        <div className="p-5">
          <div className="text-xs font-bold text-zinc-500">What this feature becomes</div>
          <div className="mt-1 text-lg font-black text-zinc-900">Real Marketplace Intelligence</div>
          <div className="mt-2 text-sm text-zinc-600">
            In production, AutoIndex would fetch listing metadata (where permitted), compute distance via geocoding, and
            pull part reputation from verified purchase signals.
          </div>
          <button
            onClick={() => {
              window.open('https://www.facebook.com/marketplace/', '_blank', 'noopener,noreferrer');
              toast('Opened Facebook Marketplace');
            }}
            className="mt-4 w-full rounded-2xl bg-zinc-900 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-zinc-800"
          >
            Open Facebook Marketplace
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Valuation');
  const [category, setCategory] = useState<Category | 'All'>('All');
  const [vendorId, setVendorId] = useState<string | 'All'>('All');
  const [query, setQuery] = useState('');
  const [condition, setCondition] = useState<Condition | 'All'>('All');
  const [oemOnly, setOemOnly] = useState(false);
  const [returnsOnly, setReturnsOnly] = useState(false);
  const [sort, setSort] = useState<'Best Match' | 'Price: Low' | 'Price: High' | 'Top Rated'>('Best Match');

  const [vehicleYear, setVehicleYear] = useState('2018');
  const [vehicleMake, setVehicleMake] = useState('Subaru');
  const [vehicleModel, setVehicleModel] = useState('WRX');
  const [zip, setZip] = useState('06770');
  const [partType] = useState<PartType>('OEM');
  const [baseAnchor] = useState('450');
  const [ageBand] = useState<AgeBandKey>('years_15_plus');
  const [conditionGrade] = useState<ConditionGradeKey>('excellent_used');
  const [availabilityLevel] = useState<AvailabilityKey>('discontinued');
  const [demandLevel] = useState<DemandKey>('high');

  const [saved, setSaved] = useLocalStorageState<string[]>('autoindex_saved_items', []);
  const [cart, setCart] = useLocalStorageState<string[]>('autoindex_cart_items', []);
  const [valuations, setValuations] = useLocalStorageState<SavedValuation[]>('autoindex_valuations', []);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [extraVendors, setExtraVendors] = useLocalStorageState<Vendor[]>('autoindex_extra_vendors', []);
  const [userListings, setUserListings] = useLocalStorageState<Listing[]>('autoindex_user_listings', []);
  const [orders, setOrders] = useLocalStorageState<OrderRecord[]>('autoindex_orders', []);
  const [vendorFeedback, setVendorFeedback] = useLocalStorageState<VendorFeedback[]>('autoindex_vendor_feedback', []);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toast = (msg: string) => setToastMsg(msg);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState<Exclude<UserRole, 'admin'>>('individual');
  const [authVendorName, setAuthVendorName] = useState('');
  const [authVendorLocation, setAuthVendorLocation] = useState('');

  const [sellTitle, setSellTitle] = useState('');
  const [sellCategory, setSellCategory] = useState<Category>('Engine');
  const [sellCondition, setSellCondition] = useState<Condition>('Used');
  const [sellBrand, setSellBrand] = useState('');
  const [sellFitment, setSellFitment] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [reviewRating, setReviewRating] = useState('5');
  const [reviewComment, setReviewComment] = useState('');

  const [cartOpen, setCartOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [vendorApplyOpen, setVendorApplyOpen] = useState(false);
  const [vendorApplyName, setVendorApplyName] = useState('');
  const [vendorApplyLocation, setVendorApplyLocation] = useState('');

  const listingsRef = useRef<HTMLDivElement | null>(null);
  const combinedVendors = useMemo(() => [...VENDORS, ...extraVendors], [extraVendors]);
  const allListings = useMemo(
    () => [...MOCK_LISTINGS.map((l) => ({ ...l, sellerType: 'vendor' as const })), ...userListings],
    [userListings]
  );

  const upsertVendorDirectory = (user: SessionUser) => {
    if (user.role !== 'vendor' || !user.vendorId) return;
    setExtraVendors((prev) => {
      if (prev.some((v) => v.id === user.vendorId)) return prev;
      return [
        ...prev,
        {
          id: user.vendorId,
          name: user.vendorName ?? `${user.username} Performance`,
          location: user.vendorLocation ?? 'Unknown, USA',
          rating: 5,
          reviews: 0,
          verified: false,
          fastShip: false
        }
      ];
    });
  };

  useEffect(() => {
    const hydrateSession = async () => {
      if (!HAS_API_BASE) {
        ensureLocalAuthUsers();
        const localSession = readLocalSession();
        setSession(localSession);
        if (localSession) upsertVendorDirectory(localSession);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' });
        if (!res.ok) {
          setSession(null);
          return;
        }
        const data = (await res.json()) as { user: SessionUser };
        setSession(data.user);
        upsertVendorDirectory(data.user);
      } catch {
        setSession(null);
      }
    };
    hydrateSession();
  }, [setExtraVendors]);

  useEffect(() => {
    if (session?.role === 'vendor' && !session.vendorId) {
      setActiveTab('Dashboard');
    }
    if (session?.role !== 'individual' && activeTab === 'Sell') {
      setActiveTab('Valuation');
    }
    if (!session && (activeTab === 'Sell' || activeTab === 'Dashboard')) {
      setActiveTab('Valuation');
    }
  }, [activeTab, session]);

  const filtered = useMemo(() => {
    let list = [...allListings];

    if (category !== 'All') list = list.filter((l) => l.category === category);
    if (vendorId !== 'All') list = list.filter((l) => l.vendorId === vendorId && l.sellerType !== 'individual');
    if (condition !== 'All') list = list.filter((l) => l.condition === condition);
    if (oemOnly) list = list.filter((l) => l.brand === 'OEM' || l.badge === 'OEM');
    if (returnsOnly) list = list.filter((l) => l.returns);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.brand.toLowerCase().includes(q) ||
          l.fitment.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q)
      );
    }

    if (sort === 'Price: Low') list.sort((a, b) => a.price - b.price);
    if (sort === 'Price: High') list.sort((a, b) => b.price - a.price);
    if (sort === 'Top Rated') list.sort((a, b) => b.rating - a.rating);

    return list;
  }, [allListings, category, vendorId, condition, oemOnly, returnsOnly, query, sort]);

  const fpvCalc = useMemo(() => {
    const parsedBase = Number(baseAnchor.replace(/[^0-9.]/g, ''));
    const normalizedBase = Number.isFinite(parsedBase) && parsedBase > 0 ? parsedBase : 0;
    const ageRow = AGE_FACTORS.find((x) => x.key === ageBand) ?? AGE_FACTORS[0]!;
    const conditionRow = CONDITION_FACTORS.find((x) => x.key === conditionGrade) ?? CONDITION_FACTORS[0]!;
    const availabilityRow =
      AVAILABILITY_FACTORS.find((x) => x.key === availabilityLevel) ?? AVAILABILITY_FACTORS[0]!;
    const demandRow = MARKET_DEMAND_FACTORS.find((x) => x.key === demandLevel) ?? MARKET_DEMAND_FACTORS[0]!;
    const ageFactor = partType === 'OEM' ? ageRow.oem : ageRow.performance;
    const fairMarketValue = Math.round(
      normalizedBase * ageFactor * conditionRow.factor * availabilityRow.factor * demandRow.factor
    );
    const highMultiplier = availabilityRow.factor >= 1.25 ? 1.17 : 1.12;
    const low = Math.round(fairMarketValue * 0.9);
    const high = Math.round(fairMarketValue * highMultiplier);
    return {
      baseAnchor: normalizedBase,
      ageRow,
      conditionRow,
      availabilityRow,
      demandRow,
      ageFactor,
      fairMarketValue,
      range: { low, mid: fairMarketValue, high }
    };
  }, [ageBand, availabilityLevel, baseAnchor, conditionGrade, demandLevel, partType]);

  const login = async () => {
    const username = authUsername.trim();
    if (!username || !authPassword) {
      toast('Enter username and password');
      return;
    }
    if (!HAS_API_BASE) {
      const users = ensureLocalAuthUsers();
      const found = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
      if (!found || found.password !== authPassword) {
        toast('Invalid login credentials');
        return;
      }
      const localUser: SessionUser = {
        id: found.id,
        username: found.username,
        role: found.role,
        vendorId: found.vendorId,
        vendorName: found.vendorName,
        vendorLocation: found.vendorLocation
      };
      writeLocalSession(localUser);
      setSession(localUser);
      upsertVendorDirectory(localUser);
      setAuthOpen(false);
      setAuthPassword('');
      setReviewComment('');
      toast(`Logged in as ${localUser.role}`);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: authPassword })
      });
      const data = (await res.json()) as { user?: SessionUser; error?: string };
      if (!res.ok || !data.user) {
        toast(data.error ?? 'Invalid login credentials');
        return;
      }
      setSession(data.user);
      upsertVendorDirectory(data.user);
      setAuthOpen(false);
      setAuthPassword('');
      setReviewComment('');
      toast(`Logged in as ${data.user.role}`);
    } catch {
      toast('Login failed');
    }
  };

  const signup = async () => {
    const username = authUsername.trim();
    if (!username || authPassword.length < MIN_PASSWORD_LENGTH) {
      toast(`Use a username and password of at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (!HAS_API_BASE) {
      const users = ensureLocalAuthUsers();
      const exists = users.some((u) => u.username.toLowerCase() === username.toLowerCase());
      if (exists) {
        toast('Username already exists');
        return;
      }
      const localUser: LocalAuthUser = {
        id: `local-${Date.now()}`,
        username,
        password: authPassword,
        role: authRole,
        vendorId: authRole === 'vendor' ? `vx-local-${Date.now()}` : undefined,
        vendorName: authRole === 'vendor' ? authVendorName.trim() || `${username} Performance` : undefined,
        vendorLocation: authRole === 'vendor' ? authVendorLocation.trim() || 'Unknown, USA' : undefined
      };
      writeLocalAuthUsers([localUser, ...users]);
      const sessionUser: SessionUser = {
        id: localUser.id,
        username: localUser.username,
        role: localUser.role,
        vendorId: localUser.vendorId,
        vendorName: localUser.vendorName,
        vendorLocation: localUser.vendorLocation
      };
      writeLocalSession(sessionUser);
      setSession(sessionUser);
      upsertVendorDirectory(sessionUser);
      setAuthOpen(false);
      setAuthPassword('');
      toast('Account created');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password: authPassword,
          role: authRole,
          vendorName: authVendorName.trim(),
          vendorLocation: authVendorLocation.trim()
        })
      });
      const data = (await res.json()) as { user?: SessionUser; error?: string };
      if (!res.ok || !data.user) {
        toast(data.error ?? 'Signup failed');
        return;
      }
      setSession(data.user);
      upsertVendorDirectory(data.user);
      setAuthOpen(false);
      setAuthPassword('');
      toast('Account created');
    } catch {
      toast('Signup failed');
    }
  };

  const handleSave = (id: string) => {
    if (!session) {
      setAuthMode('login');
      setAuthOpen(true);
      toast('Login required');
      return;
    }
    setSaved((s) => (s.includes(id) ? s : [...s, id]));
    toast('Saved item');
  };

  const handleCart = (id: string) => {
    if (!session) {
      setAuthMode('login');
      setAuthOpen(true);
      toast('Login required');
      return;
    }
    if (session.role !== 'individual') {
      toast('Only Individual Users can place orders');
      return;
    }
    setCart((c) => (c.includes(id) ? c : [...c, id]));
    toast('Added to cart');
  };

  const openDetail = (id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  const browseMatches = () => {
    toast('Jumping to recommended listings');
    setTimeout(() => listingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const saveValuation = () => {
    setValuations((v) => [
      {
        ts: Date.now(),
        year: vehicleYear,
        make: vehicleMake,
        model: vehicleModel,
        zip,
        category,
        condition: fpvCalc.conditionRow.label,
        range: fpvCalc.range,
        formula: {
          partType,
          baseAnchor: fpvCalc.baseAnchor,
          ageFactor: fpvCalc.ageFactor,
          conditionFactor: fpvCalc.conditionRow.factor,
          availabilityFactor: fpvCalc.availabilityRow.factor,
          marketDemandFactor: fpvCalc.demandRow.factor
        }
      },
      ...v
    ]);
    toast('Valuation saved');
  };

  const createIndividualListing = () => {
    if (!session || session.role !== 'individual') {
      toast('Only Individual Users can list parts for sale');
      return;
    }
    const price = Number(sellPrice.replace(/[^0-9.]/g, ''));
    if (!sellTitle.trim() || !sellBrand.trim() || !sellFitment.trim() || !price || price <= 0) {
      toast('Complete all sell form fields');
      return;
    }
    const listing: Listing = {
      id: `ul-${Date.now()}`,
      title: sellTitle.trim(),
      category: sellCategory,
      condition: sellCondition,
      brand: sellBrand.trim(),
      fitment: sellFitment.trim(),
      price,
      vendorId: `user-${session.id}`,
      ships: 'Paid',
      returns: false,
      rating: 5,
      reviews: 0,
      sellerType: 'individual',
      sellerUserId: session.id,
      sellerName: session.username
    };
    setUserListings((l) => [listing, ...l]);
    setSellTitle('');
    setSellBrand('');
    setSellFitment('');
    setSellPrice('');
    toast('Listing published');
  };

  const currentDetail = useMemo(() => {
    const listing = detailId ? allListings.find((x) => x.id === detailId) : null;
    if (!listing) return null;
    return { listing, vendor: combinedVendors.find((v) => v.id === listing.vendorId) };
  }, [allListings, combinedVendors, detailId]);

  const cartItems = useMemo(
    () => cart.map((id) => allListings.find((l) => l.id === id)).filter(Boolean) as Listing[],
    [allListings, cart]
  );
  const savedItems = useMemo(
    () => saved.map((id) => allListings.find((l) => l.id === id)).filter(Boolean) as Listing[],
    [allListings, saved]
  );

  const cartTotal = useMemo(() => cartItems.reduce((sum, l) => sum + l.price, 0), [cartItems]);
  const vendorRevenue = useMemo(() => {
    if (!session || session.role !== 'vendor' || !session.vendorId) return { daily: 0, weekly: 0, monthly: 0 };
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const scoped = orders.filter((o) => o.sellerType === 'vendor' && o.sellerId === session.vendorId);
    const sum = (maxAgeDays: number) =>
      scoped.filter((o) => now - o.ts <= maxAgeDays * dayMs).reduce((total, o) => total + o.amount, 0);
    return { daily: sum(1), weekly: sum(7), monthly: sum(30) };
  }, [orders, session]);
  const adminRevenue = useMemo(() => {
    if (!session || session.role !== 'admin') return null;
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const within = (days: number) => orders.filter((o) => now - o.ts <= days * dayMs);
    const summarize = (days: number) => {
      const bucket = within(days);
      const total = bucket.reduce((sum, o) => sum + o.amount, 0);
      const vendor = bucket.filter((o) => o.sellerType === 'vendor').reduce((sum, o) => sum + o.amount, 0);
      const individual = bucket.filter((o) => o.sellerType === 'individual').reduce((sum, o) => sum + o.amount, 0);
      return { total, vendor, individual };
    };
    return { daily: summarize(1), weekly: summarize(7), monthly: summarize(30) };
  }, [orders, session]);
  const vendorReviews = useMemo(() => {
    if (!session || session.role !== 'vendor' || !session.vendorId) return [];
    return vendorFeedback.filter((r) => r.vendorId === session.vendorId).sort((a, b) => b.ts - a.ts);
  }, [session, vendorFeedback]);

  useEffect(() => {
    setCartOpen(false);
    setSavedOpen(false);
    setDetailOpen(false);
    setVendorApplyOpen(false);
  }, [activeTab]);

  const navTabs: Tab[] = ['Valuation', 'Marketplace', 'Vendors', 'Learn'];
  if (session?.role === 'individual') navTabs.push('Sell');
  if (session?.role === 'vendor' || session?.role === 'admin') navTabs.push('Dashboard');

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      {toastMsg ? <Toast msg={toastMsg} onClose={() => setToastMsg(null)} /> : null}

      <Drawer open={cartOpen} title={`Cart (${cartItems.length})`} onClose={() => setCartOpen(false)}>
        {cartItems.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            Your cart is empty. Add a part to test checkout flow.
          </div>
        ) : (
          <div className="space-y-3">
            {cartItems.map((l) => (
              <div key={l.id} className="rounded-2xl border border-zinc-200 bg-white p-3">
                <div className="text-sm font-black">{l.title}</div>
                <div className="text-xs text-zinc-600">
                  {l.category} • {l.condition} • {l.brand}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm font-black">{fmtMoney(l.price)}</div>
                  <button
                    onClick={() => {
                      setCart((c) => c.filter((x) => x !== l.id));
                      toast('Removed from cart');
                    }}
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-extrabold hover:bg-zinc-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-center justify-between text-sm font-black">
                <span>Total</span>
                <span>{fmtMoney(cartTotal)}</span>
              </div>
              <button
                onClick={() => {
                  if (!session || session.role !== 'individual') {
                    toast('Only Individual Users can checkout');
                    return;
                  }
                  const created = cartItems.map<OrderRecord>((item) => ({
                    id: `o-${Date.now()}-${item.id}-${Math.floor(Math.random() * 1e5)}`,
                    ts: Date.now(),
                    sellerType: item.sellerType === 'individual' ? 'individual' : 'vendor',
                    sellerId: item.sellerType === 'individual' ? item.sellerUserId ?? 'unknown-user' : item.vendorId,
                    sellerName:
                      item.sellerType === 'individual'
                        ? item.sellerName ?? 'Individual Seller'
                        : combinedVendors.find((v) => v.id === item.vendorId)?.name ?? 'Vendor',
                    amount: item.price,
                    buyerId: session.id,
                    buyerRole: session.role,
                    listingId: item.id,
                    listingTitle: item.title
                  }));
                  setOrders((prev) => [...created, ...prev]);
                  toast('Checkout completed');
                  setCart([]);
                }}
                className="mt-3 w-full rounded-2xl bg-zinc-900 py-2.5 text-sm font-extrabold text-white hover:bg-zinc-800"
              >
                Checkout
              </button>
              <div className="mt-2 text-[12px] text-zinc-500">No payment is processed in this MVP.</div>
            </div>
          </div>
        )}
      </Drawer>

      <Drawer open={savedOpen} title={`Saved (${savedItems.length})`} onClose={() => setSavedOpen(false)}>
        {savedItems.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            Nothing saved yet. Tap Save on a listing.
          </div>
        ) : (
          <div className="space-y-3">
            {savedItems.map((l) => (
              <div key={l.id} className="rounded-2xl border border-zinc-200 bg-white p-3">
                <div className="text-sm font-black">{l.title}</div>
                <div className="text-xs text-zinc-600">
                  {l.category} • {l.condition} • {l.brand}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <button
                    onClick={() => openDetail(l.id)}
                    className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-zinc-800"
                  >
                    View
                  </button>
                  <button
                    onClick={() => {
                      setSaved((s) => s.filter((x) => x !== l.id));
                      toast('Removed from saved');
                    }}
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-extrabold hover:bg-zinc-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      <Drawer open={detailOpen} title="Listing" onClose={() => setDetailOpen(false)}>
        {currentDetail?.listing ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
              <SectionImage kind={currentDetail.listing.category} />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-500">
                {currentDetail.listing.category} • {currentDetail.listing.condition} • {currentDetail.listing.brand}
              </div>
              <div className="mt-1 text-lg font-black">{currentDetail.listing.title}</div>
              <div className="mt-1 text-sm text-zinc-600">Fitment: {currentDetail.listing.fitment}</div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-black">{fmtMoney(currentDetail.listing.price)}</div>
                <div className="inline-flex items-center gap-2">
                  <StarRow value={currentDetail.listing.rating} />
                  <span className="text-xs font-black">{currentDetail.listing.rating.toFixed(1)}</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-zinc-600">
                Ships: {currentDetail.listing.ships} •{' '}
                {currentDetail.listing.returns ? 'Returns accepted' : 'Final sale'}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-3">
              <div className="text-xs font-bold text-zinc-500">
                {currentDetail.listing.sellerType === 'individual' ? 'Individual seller' : 'Vendor'}
              </div>
              <div className="mt-1 flex items-start justify-between">
                <div>
                  <div className="text-sm font-black">
                    {currentDetail.listing.sellerType === 'individual'
                      ? currentDetail.listing.sellerName ?? 'Individual Seller'
                      : currentDetail.vendor?.name}
                  </div>
                  <div className="text-xs text-zinc-600">
                    {currentDetail.listing.sellerType === 'individual'
                      ? 'Peer-to-peer listing'
                      : currentDetail.vendor?.location}
                  </div>
                </div>
                {currentDetail.vendor?.verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-bold text-zinc-800">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                ) : null}
              </div>
            </div>

            {session?.role === 'individual' &&
            currentDetail.listing.sellerType !== 'individual' &&
            currentDetail.vendor ? (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="text-xs font-bold text-zinc-600">Leave vendor feedback</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(e.target.value)}
                    className="rounded-xl border border-zinc-200 bg-white px-2 py-1.5 text-sm outline-none"
                  >
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                  </select>
                  <button
                    onClick={() => {
                      if (!reviewComment.trim()) {
                        toast('Add a review comment');
                        return;
                      }
                      setVendorFeedback((f) => [
                        {
                          id: `r-${Date.now()}`,
                          vendorId: currentDetail.vendor!.id,
                          vendorName: currentDetail.vendor!.name,
                          reviewerId: session.id,
                          reviewerName: session.username,
                          rating: Number(reviewRating),
                          comment: reviewComment.trim(),
                          ts: Date.now()
                        },
                        ...f
                      ]);
                      setReviewComment('');
                      setReviewRating('5');
                      toast('Review submitted');
                    }}
                    className="rounded-xl bg-zinc-900 px-2 py-1.5 text-sm font-extrabold text-white hover:bg-zinc-800"
                  >
                    Submit review
                  </button>
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                  rows={3}
                  placeholder="Tell this vendor how your buying experience went"
                />
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  handleCart(currentDetail.listing.id);
                  setCartOpen(true);
                }}
                className="rounded-2xl bg-zinc-900 py-2 text-sm font-extrabold text-white hover:bg-zinc-800"
              >
                Add to cart
              </button>
              <button
                onClick={() => {
                  handleSave(currentDetail.listing.id);
                  setSavedOpen(true);
                }}
                className="rounded-2xl border border-zinc-200 bg-white py-2 text-sm font-extrabold hover:bg-zinc-50"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">Select a listing.</div>
        )}
      </Drawer>

      <Drawer open={vendorApplyOpen} title="Become a vendor" onClose={() => setVendorApplyOpen(false)}>
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            Submit your business details and complete signup as a Vendor account to access the vendor dashboard.
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-xs font-bold text-zinc-600">Business name</div>
              <input
                value={vendorApplyName}
                onChange={(e) => setVendorApplyName(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                placeholder="Your shop name"
              />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-600">Primary location</div>
              <input
                value={vendorApplyLocation}
                onChange={(e) => setVendorApplyLocation(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                placeholder="City, State"
              />
            </div>
            <button
              onClick={() => {
                if (!vendorApplyName.trim() || !vendorApplyLocation.trim()) {
                  toast('Enter business name and location');
                  return;
                }
                if (session?.role === 'vendor') {
                  toast('You already have a vendor account');
                  setVendorApplyOpen(false);
                  return;
                }
                if (session?.role === 'individual') {
                  toast('Log out, then sign up as Vendor to complete onboarding');
                  setVendorApplyOpen(false);
                  return;
                }
                setAuthMode('signup');
                setAuthRole('vendor');
                setAuthVendorName(vendorApplyName.trim());
                setAuthVendorLocation(vendorApplyLocation.trim());
                setAuthOpen(true);
                setVendorApplyOpen(false);
                toast('Complete vendor signup to finish onboarding');
                setVendorApplyName('');
                setVendorApplyLocation('');
              }}
              className="w-full rounded-2xl bg-zinc-900 py-2.5 text-sm font-extrabold text-white hover:bg-zinc-800"
            >
              Continue
            </button>
          </div>
        </div>
      </Drawer>

      <Drawer open={authOpen} title={authMode === 'login' ? 'Login' : 'Create account'} onClose={() => setAuthOpen(false)}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setAuthMode('login')}
              className={`rounded-xl py-2 text-xs font-extrabold ${
                authMode === 'login' ? 'bg-zinc-900 text-white' : 'border border-zinc-200 bg-white'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              className={`rounded-xl py-2 text-xs font-extrabold ${
                authMode === 'signup' ? 'bg-zinc-900 text-white' : 'border border-zinc-200 bg-white'
              }`}
            >
              Sign up
            </button>
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-600">Username</div>
            <input
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
              placeholder="username"
            />
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-600">Password</div>
            <input
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
              placeholder="password"
            />
          </div>
          {authMode === 'signup' ? (
            <>
              <div>
                <div className="text-xs font-bold text-zinc-600">Account type</div>
                <select
                  value={authRole}
                  onChange={(e) => setAuthRole(e.target.value as Exclude<UserRole, 'admin'>)}
                  className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                >
                  <option value="individual">Individual User</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>
              {authRole === 'vendor' ? (
                <>
                  <div>
                    <div className="text-xs font-bold text-zinc-600">Vendor name</div>
                    <input
                      value={authVendorName}
                      onChange={(e) => setAuthVendorName(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                      placeholder="Shop name"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-600">Vendor location</div>
                    <input
                      value={authVendorLocation}
                      onChange={(e) => setAuthVendorLocation(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                      placeholder="City, State"
                    />
                  </div>
                </>
              ) : null}
            </>
          ) : null}
          <button
            onClick={authMode === 'login' ? login : signup}
            className="w-full rounded-2xl bg-zinc-900 py-2.5 text-sm font-extrabold text-white hover:bg-zinc-800"
          >
            {authMode === 'login' ? 'Login' : 'Create account'}
          </button>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
            {HAS_API_BASE
              ? `Use your account credentials to continue. Password minimum: ${MIN_PASSWORD_LENGTH} characters.`
              : `Template mode active: account data is stored in this browser only. Password minimum: ${MIN_PASSWORD_LENGTH} characters.`}
          </div>
        </div>
      </Drawer>

      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between gap-4 py-3">
            <button
              className="flex items-center gap-3 text-left"
              onClick={() => {
                setActiveTab('Valuation');
                toast('Home');
              }}
            >
              <img src={AUTO_INDEX_LOGO} alt="AutoIndex logo" className="h-10 w-auto rounded-xl" />
              <div className="leading-tight">
                <div className="text-lg font-extrabold tracking-tight">AutoIndex</div>
                <div className="text-xs text-zinc-500">Parts pricing intelligence + marketplace</div>
              </div>
            </button>

            <div className="hidden w-[420px] items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 shadow-sm md:flex">
              <Search className="h-4 w-4 text-zinc-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search parts, brands, fitment..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setVendorApplyOpen(true)}
                className="hidden items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-extrabold hover:bg-zinc-50 sm:inline-flex"
              >
                <Store className="h-4 w-4" /> Become a vendor
              </button>

              <button
                onClick={() => setSavedOpen(true)}
                className="hidden items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-extrabold hover:bg-zinc-50 sm:inline-flex"
              >
                <Heart className="h-4 w-4" /> Saved <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs">{saved.length}</span>
              </button>

              <button
                onClick={() => setCartOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-zinc-800"
              >
                <ShoppingCart className="h-4 w-4" /> Cart{' '}
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{cart.length}</span>
              </button>

              {session ? (
                <>
                  <span className="hidden items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-extrabold text-zinc-700 md:inline-flex">
                    <User2 className="h-4 w-4" /> {session.username} ({session.role})
                  </span>
                  <button
                    onClick={async () => {
                      if (HAS_API_BASE) {
                        try {
                          await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
                        } catch {
                          // Ignore network errors; clear client session regardless.
                        }
                      }
                      writeLocalSession(null);
                      setSession(null);
                      setActiveTab('Valuation');
                      toast('Logged out');
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-extrabold hover:bg-zinc-50"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setAuthOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-extrabold hover:bg-zinc-50"
                >
                  <User2 className="h-4 w-4" /> Login / Sign up
                </button>
              )}
            </div>
          </div>

          <div className="pb-3 md:hidden">
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
              <Search className="h-4 w-4 text-zinc-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search parts, brands, fitment..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2 pb-3">
            {navTabs.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setActiveTab(t);
                  toast(`${t} opened`);
                }}
                className={`rounded-full border px-4 py-2 text-sm font-extrabold transition-colors ${
                  activeTab === t
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50'
                }`}
              >
                {t}
              </button>
            ))}

            <div className="ml-auto hidden items-center gap-2 lg:flex">
              <Pill>
                <Wrench className="mr-1 h-3.5 w-3.5" /> New • Used • Aftermarket
              </Pill>
              <Pill>
                <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Verified sellers
              </Pill>
              <Pill>
                <TrendingUp className="mr-1 h-3.5 w-3.5" /> Market comps
              </Pill>
              {HAS_API_BASE ? (
                <Pill>
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Backend connected
                </Pill>
              ) : (
                <Pill>
                  <Info className="mr-1 h-3.5 w-3.5" /> Template mode
                </Pill>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {activeTab === 'Valuation' ? (
          <>
            <div className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <SectionImage kind="hero" />
                </div>
                <div className="p-5">
                  <div className="text-xs font-bold text-zinc-500">Valuation</div>
                  <div className="mt-1 text-xl font-black">Price a part like a pro</div>
                  <div className="mt-2 text-sm text-zinc-600">
                    Build fair market value using part age, condition, availability, and market demand signals.
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-600">Year</label>
                      <input
                        value={vehicleYear}
                        onChange={(e) => setVehicleYear(e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-600">ZIP</label>
                      <input
                        value={zip}
                        onChange={(e) => setZip(e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-600">Make</label>
                      <input
                        value={vehicleMake}
                        onChange={(e) => setVehicleMake(e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-600">Model</label>
                      <input
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-600">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as Category | 'All')}
                        className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                      >
                        <option value="All">All</option>
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-600">Condition</label>
                      <select
                        value={condition}
                        onChange={(e) => setCondition(e.target.value as Condition | 'All')}
                        className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                      >
                        <option value="All">All</option>
                        <option value="New">New</option>
                        <option value="Used">Used</option>
                        <option value="Aftermarket">Aftermarket</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-extrabold">AutoIndex market range</div>
                      <div className="text-xs font-bold text-zinc-500">
                        {vehicleYear} {vehicleMake} {vehicleModel} • {zip}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                        <div className="text-xs font-bold text-zinc-500">Low</div>
                        <div className="text-lg font-black">{fmtMoney(fpvCalc.range.low)}</div>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                        <div className="text-xs font-bold text-zinc-500">Typical</div>
                        <div className="text-lg font-black">{fmtMoney(fpvCalc.range.mid)}</div>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                        <div className="text-xs font-bold text-zinc-500">High</div>
                        <div className="text-lg font-black">{fmtMoney(fpvCalc.range.high)}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-zinc-600">
                      AutoIndex combines age, condition, availability, and market demand signals to estimate fair value.
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      onClick={browseMatches}
                      className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-zinc-800"
                    >
                      Browse matches <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={saveValuation}
                      className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-extrabold hover:bg-zinc-50"
                    >
                      Save valuation <ClipboardList className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSavedOpen(true)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-extrabold hover:bg-zinc-50"
                    >
                      Open saved <Heart className="h-4 w-4" />
                    </button>
                  </div>

                  {valuations.length > 0 ? (
                    <div className="mt-4 rounded-3xl border border-zinc-200 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-black">Saved valuations</div>
                        <button
                          onClick={() => {
                            setValuations([]);
                            toast('Cleared valuations');
                          }}
                          className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-extrabold hover:bg-zinc-50"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="mt-3 space-y-2">
                        {valuations.slice(0, 3).map((v) => (
                          <div key={v.ts} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                            <div className="text-xs font-bold text-zinc-600">
                              {v.year} {v.make} {v.model} • {v.zip}
                            </div>
                            <div className="mt-1 text-xs text-zinc-600">
                              {String(v.category)} • {String(v.condition)}
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                              <div className="rounded-xl border border-zinc-200 bg-white p-2">
                                <div className="text-[11px] font-bold text-zinc-500">Low</div>
                                <div className="text-sm font-black">{fmtMoney(v.range.low)}</div>
                              </div>
                              <div className="rounded-xl border border-zinc-200 bg-white p-2">
                                <div className="text-[11px] font-bold text-zinc-500">Typical</div>
                                <div className="text-sm font-black">{fmtMoney(v.range.mid)}</div>
                              </div>
                              <div className="rounded-xl border border-zinc-200 bg-white p-2">
                                <div className="text-[11px] font-bold text-zinc-500">High</div>
                                <div className="text-sm font-black">{fmtMoney(v.range.high)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setCategory('All');
                  toast('Category: All');
                }}
                className={`rounded-full border px-4 py-2 text-sm font-extrabold ${
                  category === 'All' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white hover:bg-zinc-50'
                }`}
              >
                All
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCategory(c);
                    toast(`Category: ${c}`);
                  }}
                  className={`rounded-full border px-4 py-2 text-sm font-extrabold ${
                    category === c ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white hover:bg-zinc-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div ref={listingsRef} className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-4">
              <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-black">
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-600">Vendor</label>
                    <select
                      value={vendorId}
                      onChange={(e) => setVendorId(e.target.value as string | 'All')}
                      className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                    >
                      <option value="All">All vendors</option>
                      {combinedVendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-600">Sort</label>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as 'Best Match' | 'Price: Low' | 'Price: High' | 'Top Rated')}
                      className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                    >
                      <option>Best Match</option>
                      <option>Price: Low</option>
                      <option>Price: High</option>
                      <option>Top Rated</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-sm font-bold text-zinc-700">
                    <input type="checkbox" checked={oemOnly} onChange={(e) => setOemOnly(e.target.checked)} />
                    OEM only
                  </label>

                  <label className="flex items-center gap-2 text-sm font-bold text-zinc-700">
                    <input type="checkbox" checked={returnsOnly} onChange={(e) => setReturnsOnly(e.target.checked)} />
                    Returns allowed
                  </label>

                  <button
                    onClick={() => {
                      setVendorId('All');
                      setSort('Best Match');
                      setOemOnly(false);
                      setReturnsOnly(false);
                      setCondition('All');
                      setQuery('');
                      toast('Filters reset');
                    }}
                    className="w-full rounded-xl border border-zinc-200 bg-white py-2 text-xs font-extrabold hover:bg-zinc-50"
                  >
                    Reset filters
                  </button>
                </div>
              </div>

              <div className="lg:col-span-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-zinc-500">Marketplace</div>
                    <div className="text-xl font-black">Recommended listings</div>
                    <div className="text-sm text-zinc-600">Curated by category, fitment, and vendor trust signals.</div>
                  </div>
                  <div className="hidden items-center gap-2 md:flex">
                    <Pill>
                      <Tag className="mr-1 h-3.5 w-3.5" /> {filtered.length} results
                    </Pill>
                    <Pill>
                      <Store className="mr-1 h-3.5 w-3.5" /> Multi-vendor
                    </Pill>
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <div className="mt-4 rounded-3xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600">
                    No listings match current filters. Try resetting filters or broadening search terms.
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((l) => (
                      <ListingCard
                        key={l.id}
                        listing={l}
                        vendor={combinedVendors.find((v) => v.id === l.vendorId)}
                        onSave={handleSave}
                        onCart={handleCart}
                        onOpen={openDetail}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}

        {activeTab === 'Marketplace' ? <MarketplaceAnalysisPanel toast={toast} /> : null}

        {activeTab === 'Vendors' ? (
          <div className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm">
            <div className="aspect-[16/6] bg-zinc-100">
              <SectionImage kind="vendors" />
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-zinc-500">Vendor storefronts</div>
                  <div className="mt-1 text-2xl font-black">Sell parts through AutoIndex</div>
                  <div className="mt-2 text-sm text-zinc-600">
                    Vendors list inventory, manage fulfilment, and earn trust via ratings, badges, and return policies.
                  </div>
                </div>
                <button
                  onClick={() => setVendorApplyOpen(true)}
                  className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-zinc-800"
                >
                  Apply as a vendor
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {combinedVendors.map((v) => (
                  <div key={v.id} className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-lg font-black">{v.name}</div>
                        <div className="text-sm text-zinc-600">{v.location}</div>
                      </div>
                      {v.verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-bold text-zinc-800">
                          <BadgeCheck className="h-3.5 w-3.5" /> Verified
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center gap-2">
                        <StarRow value={v.rating} />
                        <span className="text-sm font-black">{v.rating.toFixed(1)}</span>
                        <span className="text-xs font-bold text-zinc-500">({v.reviews})</span>
                      </div>
                      <div className="text-xs font-bold text-zinc-600">{v.fastShip ? 'Fast ship' : 'Standard ship'}</div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => {
                          setVendorId(v.id);
                          setActiveTab('Valuation');
                          toast(`Viewing ${v.name} listings`);
                          setTimeout(() => listingsRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
                        }}
                        className="flex-1 rounded-2xl bg-zinc-900 py-2 text-sm font-extrabold text-white hover:bg-zinc-800"
                      >
                        View listings
                      </button>
                      <button
                        onClick={() => {
                          setVendorId(v.id);
                          setActiveTab('Valuation');
                          setTimeout(() => listingsRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
                          toast(`${v.name} storefront opened`);
                        }}
                        className="flex-1 rounded-2xl border border-zinc-200 bg-white py-2 text-sm font-extrabold hover:bg-zinc-50"
                      >
                        Storefront
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'Learn' ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm">
              <div className="aspect-[16/9] bg-zinc-100">
                <SectionImage kind="learn" />
              </div>
              <div className="p-6">
                <div className="text-xs font-bold text-zinc-500">Buying guide</div>
                <div className="mt-1 text-2xl font-black">How AutoIndex prices parts</div>
                <div className="mt-2 text-sm text-zinc-600">
                  We combine comparable sales, vendor trust signals, condition grading, and fitment confidence to compute
                  a fair market range.
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="text-sm font-black">Condition grading</div>
                    <div className="mt-2 text-sm text-zinc-700">
                      New is sealed and unused. Used includes mileage and wear. Aftermarket includes brand credibility,
                      versioning, and install history.
                    </div>
                  </div>
                  <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="text-sm font-black">Fitment confidence</div>
                    <div className="mt-2 text-sm text-zinc-700">
                      Fitment checks model-years, trims, bolt patterns, offsets, and compatibility notes.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-bold text-zinc-500">Quick tools</div>
              <div className="mt-1 text-2xl font-black">Shortcuts</div>

              <div className="mt-5 grid grid-cols-1 gap-4">
                <div className="rounded-3xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-black">
                    <Wrench className="h-4 w-4" /> Build list
                  </div>
                  <div className="mt-2 text-sm text-zinc-600">Save a parts list and track market pricing over time.</div>
                  <button
                    onClick={() => {
                      setSavedOpen(true);
                      toast('Saved list opened');
                    }}
                    className="mt-3 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-zinc-800"
                  >
                    Create list
                  </button>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-black">
                    <ShieldCheck className="h-4 w-4" /> Authenticity checks
                  </div>
                  <div className="mt-2 text-sm text-zinc-600">Guidance for spotting counterfeits and mismatched numbers.</div>
                  <button
                    onClick={() => {
                      setActiveTab('Marketplace');
                      toast('Use risk checklist in Marketplace analysis');
                    }}
                    className="mt-3 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-extrabold hover:bg-zinc-50"
                  >
                    Open guide
                  </button>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-black">
                    <Sparkles className="h-4 w-4" /> Marketplace analysis
                  </div>
                  <div className="mt-2 text-sm text-zinc-600">Paste a Marketplace link and get a risk score out of 10.</div>
                  <button
                    onClick={() => {
                      setActiveTab('Marketplace');
                      toast('Marketplace Analysis opened');
                    }}
                    className="mt-3 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-zinc-800"
                  >
                    Try it
                  </button>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-black">
                    <Heart className="h-4 w-4" /> Saved items
                  </div>
                  <div className="mt-2 text-sm text-zinc-600">Review your saved parts and jump back into purchase.</div>
                  <button
                    onClick={() => setSavedOpen(true)}
                    className="mt-3 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-extrabold hover:bg-zinc-50"
                  >
                    Open saved
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'Sell' ? (
          session?.role === 'individual' ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="text-xs font-bold text-zinc-500">Individual seller tools</div>
                <div className="mt-1 text-2xl font-black">Create a listing</div>
                <div className="mt-2 text-sm text-zinc-600">
                  Individual users can sell directly to other individual users while also buying from vendors.
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-zinc-600">Listing title</label>
                    <input
                      value={sellTitle}
                      onChange={(e) => setSellTitle(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                      placeholder="e.g., OEM Civic Si rear bumper"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-600">Category</label>
                    <select
                      value={sellCategory}
                      onChange={(e) => setSellCategory(e.target.value as Category)}
                      className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-600">Condition</label>
                    <select
                      value={sellCondition}
                      onChange={(e) => setSellCondition(e.target.value as Condition)}
                      className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                    >
                      <option value="New">New</option>
                      <option value="Used">Used</option>
                      <option value="Aftermarket">Aftermarket</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-600">Brand</label>
                    <input
                      value={sellBrand}
                      onChange={(e) => setSellBrand(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                      placeholder="OEM / Brand"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-600">Asking price</label>
                    <input
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                      placeholder="$500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-zinc-600">Fitment notes</label>
                    <input
                      value={sellFitment}
                      onChange={(e) => setSellFitment(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                      placeholder="2017-2021 Civic Si"
                    />
                  </div>
                </div>
                <button
                  onClick={createIndividualListing}
                  className="mt-4 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-zinc-800"
                >
                  Publish listing
                </button>
              </div>
              <div className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="text-xs font-bold text-zinc-500">My seller summary</div>
                <div className="mt-1 text-2xl font-black">Listings & sales</div>
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="text-xs font-bold text-zinc-500">Active individual listings</div>
                  <div className="text-lg font-black">
                    {userListings.filter((l) => l.sellerUserId === session.id).length}
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="text-xs font-bold text-zinc-500">Completed individual sales</div>
                  <div className="text-lg font-black">
                    {fmtMoney(
                      orders
                        .filter((o) => o.sellerType === 'individual' && o.sellerId === session.id)
                        .reduce((sum, o) => sum + o.amount, 0)
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('Valuation')}
                  className="mt-4 w-full rounded-2xl border border-zinc-200 bg-white py-2 text-sm font-extrabold hover:bg-zinc-50"
                >
                  Browse marketplace
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-700">
              Sell tools are available for logged-in Individual Users only.
            </div>
          )
        ) : null}

        {activeTab === 'Dashboard' ? (
          session?.role === 'vendor' ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="text-xs font-bold text-zinc-500">Vendor dashboard</div>
                <div className="mt-1 text-2xl font-black">Sales performance</div>
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Stat icon={TrendingUp} label="Daily sales" value={fmtMoney(vendorRevenue.daily)} />
                  <Stat icon={TrendingUp} label="Weekly sales" value={fmtMoney(vendorRevenue.weekly)} />
                  <Stat icon={TrendingUp} label="Monthly sales" value={fmtMoney(vendorRevenue.monthly)} />
                </div>
              </div>
              <div className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="text-xs font-bold text-zinc-500">Customer feedback</div>
                <div className="mt-1 text-2xl font-black">Recent reviews</div>
                <div className="mt-4 space-y-3">
                  {vendorReviews.length ? (
                    vendorReviews.slice(0, 4).map((review) => (
                      <div key={review.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                        <div className="text-xs font-bold text-zinc-500">{review.reviewerName}</div>
                        <div className="text-sm font-black">{review.rating}/5</div>
                        <div className="mt-1 text-sm text-zinc-700">{review.comment}</div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
                      No reviews yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : session?.role === 'admin' && adminRevenue ? (
            <div className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-bold text-zinc-500">Website administrator dashboard</div>
              <div className="mt-1 text-2xl font-black">Master sales overview</div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                  { label: 'Daily', data: adminRevenue.daily },
                  { label: 'Weekly', data: adminRevenue.weekly },
                  { label: 'Monthly', data: adminRevenue.monthly }
                ].map((period) => (
                  <div key={period.label} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="text-xs font-bold text-zinc-500">{period.label} total</div>
                    <div className="text-xl font-black">{fmtMoney(period.data.total)}</div>
                    <div className="mt-2 text-xs text-zinc-700">Vendor sales: {fmtMoney(period.data.vendor)}</div>
                    <div className="text-xs text-zinc-700">Individual sales: {fmtMoney(period.data.individual)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                Total completed orders tracked: <span className="font-black">{orders.length}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-700">
              Dashboard access requires a Vendor or Administrator account.
            </div>
          )
        ) : null}

        <footer className="mt-10 pb-8 text-center text-xs text-zinc-500">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 shadow-sm">
            <Info className="h-4 w-4" /> AutoIndex demo with functional controls and persistent local state.
          </div>
        </footer>
      </main>
    </div>
  );
}
