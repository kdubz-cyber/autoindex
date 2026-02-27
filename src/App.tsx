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
  ExternalLink
} from 'lucide-react';

type Tab = 'Valuation' | 'Marketplace' | 'Vendors' | 'Learn';

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
  category: Category | 'All';
  condition: Condition | 'All';
  range: { low: number; mid: number; high: number };
};

const AUTO_INDEX_LOGO =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 90"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%23dc2626"/><stop offset="1" stop-color="%230f172a"/></linearGradient></defs><rect x="0" y="0" width="420" height="90" rx="18" fill="url(%23g)"/><g fill="white"><path d="M56 63 78 27h13L69 63z"/><path d="m84 63 23-36h13L97 63z"/><path d="M141 33h17v30h-17zM174 33h17v30h-17z"/></g><text x="207" y="56" font-family="Arial,sans-serif" font-size="30" font-weight="700" fill="white">AutoIndex</text></svg>';

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
        <div className="aspect-[16/9] bg-zinc-950">
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
            <div className="mt-1 text-[11px] text-zinc-500">{vendor?.name}</div>
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

  const [analysis, setAnalysis] = useState<null | {
    platform: 'Facebook Marketplace' | 'Unknown';
    sellerTenureMonths: number;
    estimatedDistanceMiles: number;
    partCategory: Category;
    partCondition: Condition;
    partTitle?: string;
    askPrice?: number;
    partRating5: number;
    priceSignal: 'Under market' | 'At market' | 'Over market';
    riskFlags: string[];
    score10: number;
    marketRange: { low: number; mid: number; high: number };
  }>(null);

  const canAnalyse = link.trim().length > 10;

  const run = () => {
    const linkKey = link.trim().toLowerCase();
    const partKey = `${selectedCategory}|${selectedCondition}|${partTitle.trim().toLowerCase()}|${askPrice}`;
    const h = smallHash(`${linkKey}::${partKey}`);

    const platform = link.includes('facebook.com') || link.includes('fb.com') ? 'Facebook Marketplace' : 'Unknown';
    const sellerTenureMonths = 1 + (h % 96);
    const estimatedDistanceMiles = 1 + ((h >>> 3) % 240);
    const partRating5 = Math.round((3.2 + ((h >>> 13) % 18) / 10) * 10) / 10;

    const catMod = (CATEGORIES.indexOf(selectedCategory) + 1) * 35;
    const condMod = selectedCondition === 'New' ? 220 : selectedCondition === 'Aftermarket' ? 140 : 60;
    const seed = 420 + catMod + condMod;
    const low = Math.round(seed * 0.7);
    const mid = Math.round(seed);
    const high = Math.round(seed * 1.25);

    const ask = Number(String(askPrice).replace(/[^0-9.]/g, ''));
    const hasAsk = !Number.isNaN(ask) && ask > 0;

    let priceSignal: 'Under market' | 'At market' | 'Over market';
    if (hasAsk) {
      if (ask < mid * 0.9) priceSignal = 'Under market';
      else if (ask > mid * 1.1) priceSignal = 'Over market';
      else priceSignal = 'At market';
    } else {
      const signalIdx = (h >>> 17) % 3;
      priceSignal = signalIdx === 0 ? 'Under market' : signalIdx === 1 ? 'At market' : 'Over market';
    }

    const flags: string[] = [];
    if (platform !== 'Facebook Marketplace') flags.push('Link does not appear to be Facebook Marketplace.');
    if (sellerTenureMonths < 6) flags.push('Seller account tenure is relatively new.');
    if (estimatedDistanceMiles > 90) flags.push('Long travel distance may complicate pickup/returns.');
    if (priceSignal === 'Under market') flags.push('Price is notably under market; verify authenticity and condition.');
    if (selectedCondition === 'Used') flags.push('Used parts require photos, serials, and fitment confirmation.');
    if (hasAsk && (ask < low * 0.75 || ask > high * 1.4)) flags.push('Ask price is an outlier vs estimated market range.');
    if (partTitle.trim().length === 0) flags.push('Add a part title to improve matching and verification prompts.');

    const tenureScore = clamp(sellerTenureMonths / 24, 0, 1);
    const distanceScore = clamp(1 - estimatedDistanceMiles / 200, 0, 1);
    const ratingScore = clamp((partRating5 - 3.2) / 1.8, 0, 1);

    let priceScore = priceSignal === 'At market' ? 1 : priceSignal === 'Under market' ? 0.7 : 0.6;
    if (hasAsk) {
      const delta = Math.abs(ask - mid) / mid;
      priceScore = clamp(1 - delta, 0.35, 1);
    }

    const score10 =
      Math.round((tenureScore * 0.3 + distanceScore * 0.2 + ratingScore * 0.35 + priceScore * 0.15) * 100) / 10;

    setAnalysis({
      platform,
      sellerTenureMonths,
      estimatedDistanceMiles,
      partCategory: selectedCategory,
      partCondition: selectedCondition,
      partTitle: partTitle.trim() || undefined,
      askPrice: hasAsk ? ask : undefined,
      partRating5,
      priceSignal,
      riskFlags: flags,
      score10,
      marketRange: { low, mid, high }
    });

    toast('Marketplace analysis complete');
  };

  const label = analysis ? scoreToLabel(analysis.score10) : null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm lg:col-span-2">
        <div className="aspect-[16/9] bg-zinc-950">
          <SectionImage kind="hero" />
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-zinc-500">Marketplace Analysis</div>
              <div className="mt-1 text-xl font-black text-zinc-900">Analyse a Facebook Marketplace listing before you buy</div>
              <div className="mt-2 text-sm text-zinc-600">
                Paste a listing link, select the specific part being sold, and we will simulate checks for seller tenure,
                travel distance, and a parts reputation signal.
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-extrabold text-zinc-800">
              <Sparkles className="h-4 w-4" /> MVP (Mocked)
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
                <Info className="h-4 w-4" /> We do not fetch live pages in this MVP.
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
              disabled={!canAnalyse}
              onClick={run}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-extrabold text-white transition-colors ${
                canAnalyse ? 'bg-zinc-900 hover:bg-zinc-800' : 'cursor-not-allowed bg-zinc-300'
              }`}
            >
              Run analysis <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {analysis ? (
            <div className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-zinc-500">Results</div>
                  <div className="mt-1 text-lg font-black text-zinc-900">
                    {analysis.partCategory} • {analysis.partCondition} • {analysis.platform}
                  </div>
                  {analysis.partTitle ? <div className="mt-1 text-sm font-semibold text-zinc-700">{analysis.partTitle}</div> : null}
                  {typeof analysis.askPrice === 'number' ? (
                    <div className="mt-1 text-xs text-zinc-600">
                      Ask price: <span className="font-black">{fmtMoney(analysis.askPrice)}</span>
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
                  <Tag className="h-4 w-4" /> Price signal: {analysis.priceSignal}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-extrabold text-zinc-800">
                  <TrendingUp className="h-4 w-4" /> Est. market: {fmtMoney(analysis.marketRange.low)}–
                  {fmtMoney(analysis.marketRange.high)}
                </span>
                {buyerZip ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-extrabold text-zinc-800">
                    <MapPin className="h-4 w-4" /> Buyer ZIP: {buyerZip}
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
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="aspect-[16/10] bg-zinc-950">
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
            onClick={() => toast('Coming soon: Marketplace account connection')}
            className="mt-4 w-full rounded-2xl bg-zinc-900 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-zinc-800"
          >
            Coming soon: Connect Marketplace accounts
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

  const [saved, setSaved] = useLocalStorageState<string[]>('autoindex_saved_items', []);
  const [cart, setCart] = useLocalStorageState<string[]>('autoindex_cart_items', []);
  const [valuations, setValuations] = useLocalStorageState<SavedValuation[]>('autoindex_valuations', []);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toast = (msg: string) => setToastMsg(msg);

  const [cartOpen, setCartOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [vendorApplyOpen, setVendorApplyOpen] = useState(false);

  const listingsRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    let list = [...MOCK_LISTINGS];

    if (category !== 'All') list = list.filter((l) => l.category === category);
    if (vendorId !== 'All') list = list.filter((l) => l.vendorId === vendorId);
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
  }, [category, vendorId, condition, oemOnly, returnsOnly, query, sort]);

  const marketRange = useMemo(() => {
    const base = 420;
    const modYear = (parseInt(vehicleYear || '2018', 10) % 10) * 12;
    const modCond = condition === 'New' ? 220 : condition === 'Aftermarket' ? 140 : condition === 'Used' ? 60 : 110;
    const modCat = category === 'All' ? 90 : (CATEGORIES.indexOf(category as Category) + 1) * 35;
    const seed = base + modYear + modCond + modCat;
    const low = Math.round(seed * 0.7);
    const mid = Math.round(seed);
    const high = Math.round(seed * 1.25);
    return { low, mid, high };
  }, [vehicleYear, condition, category]);

  const handleSave = (id: string) => {
    setSaved((s) => (s.includes(id) ? s : [...s, id]));
    toast('Saved item');
  };

  const handleCart = (id: string) => {
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
        condition,
        range: marketRange
      },
      ...v
    ]);
    toast('Valuation saved');
  };

  const currentDetail = useMemo(() => {
    const listing = detailId ? MOCK_LISTINGS.find((x) => x.id === detailId) : null;
    if (!listing) return null;
    return { listing, vendor: VENDORS.find((v) => v.id === listing.vendorId) };
  }, [detailId]);

  const cartItems = useMemo(
    () => cart.map((id) => MOCK_LISTINGS.find((l) => l.id === id)).filter(Boolean) as Listing[],
    [cart]
  );
  const savedItems = useMemo(
    () => saved.map((id) => MOCK_LISTINGS.find((l) => l.id === id)).filter(Boolean) as Listing[],
    [saved]
  );

  const cartTotal = useMemo(() => cartItems.reduce((sum, l) => sum + l.price, 0), [cartItems]);

  useEffect(() => {
    setCartOpen(false);
    setSavedOpen(false);
    setDetailOpen(false);
    setVendorApplyOpen(false);
  }, [activeTab]);

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
                  toast('Checkout simulated (MVP)');
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
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950">
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
              <div className="text-xs font-bold text-zinc-500">Vendor</div>
              <div className="mt-1 flex items-start justify-between">
                <div>
                  <div className="text-sm font-black">{currentDetail.vendor?.name}</div>
                  <div className="text-xs text-zinc-600">{currentDetail.vendor?.location}</div>
                </div>
                {currentDetail.vendor?.verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-bold text-zinc-800">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                ) : null}
              </div>
            </div>

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
            This is a mocked onboarding flow. In production, this would capture business details, fulfilment policies, and
            catalogue feeds.
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-xs font-bold text-zinc-600">Business name</div>
              <input
                className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                placeholder="Your shop name"
              />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-600">Primary location</div>
              <input
                className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                placeholder="City, State"
              />
            </div>
            <button
              onClick={() => {
                toast('Vendor application submitted (simulated)');
                setVendorApplyOpen(false);
              }}
              className="w-full rounded-2xl bg-zinc-900 py-2.5 text-sm font-extrabold text-white hover:bg-zinc-800"
            >
              Submit application
            </button>
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
            {(['Valuation', 'Marketplace', 'Vendors', 'Learn'] as const).map((t) => (
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
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {activeTab === 'Valuation' ? (
          <>
            <div className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-3">
                <div className="bg-zinc-950 lg:col-span-2">
                  <SectionImage kind="hero" />
                </div>
                <div className="p-5">
                  <div className="text-xs font-bold text-zinc-500">Get a value</div>
                  <div className="mt-1 text-xl font-black">Price a part like a pro</div>
                  <div className="mt-2 text-sm text-zinc-600">
                    Select vehicle + category + condition to generate an AutoIndex market range.
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
                        <div className="text-lg font-black">{fmtMoney(marketRange.low)}</div>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                        <div className="text-xs font-bold text-zinc-500">Typical</div>
                        <div className="text-lg font-black">{fmtMoney(marketRange.mid)}</div>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                        <div className="text-xs font-bold text-zinc-500">High</div>
                        <div className="text-lg font-black">{fmtMoney(marketRange.high)}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-zinc-600">
                      Mock estimate. Production uses comps, vendor sales history, and condition grading.
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
                      {VENDORS.map((v) => (
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
                        vendor={VENDORS.find((v) => v.id === l.vendorId)}
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
            <div className="aspect-[16/6] bg-zinc-950">
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
                {VENDORS.map((v) => (
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
                        onClick={() => toast('Storefront opened (simulated)')}
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
              <div className="aspect-[16/9] bg-zinc-950">
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
                    onClick={() => toast('Build list created (simulated)')}
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
                    onClick={() => toast('Authenticity guide opened (simulated)')}
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

        <footer className="mt-10 pb-8 text-center text-xs text-zinc-500">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 shadow-sm">
            <Info className="h-4 w-4" /> AutoIndex demo with functional controls and persistent local state.
          </div>
        </footer>
      </main>
    </div>
  );
}
