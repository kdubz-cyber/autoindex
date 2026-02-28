import { PartCategory, PartCondition, MarketSource } from './constants';

export type AnalysisRiskLevel = 'low' | 'medium' | 'high';

export type AnalysisSignal = {
  distanceMiles?: number;
  sellerTenure?: string;
  sellerRating?: number;
  listingAge?: string;
};

export type AnalysisRisk = {
  level: AnalysisRiskLevel;
  message: string;
};

export type AnalysisOutput = {
  score: number;
  confidence: 'High' | 'Medium' | 'Low';
  signals: AnalysisSignal;
  risks: AnalysisRisk[];
  recommendations: string[];
  askPrice?: number;
  fairMarketValue: {
    low: number;
    mid: number;
    high: number;
    deltaPct?: number;
    signal: 'Under market' | 'At market' | 'Over market' | 'Unknown';
  };
};

export type AnalysisInput = {
  url: string;
  category: PartCategory;
  condition: PartCondition;
  source: MarketSource;
  askPrice?: number;
};

const RISK_WEIGHT: Record<PartCategory, number> = {
  Engine: 0.58,
  Suspension: 0.44,
  Transmission: 0.55,
  Brakes: 0.78,
  Rims: 0.4,
  Tires: 0.76,
  Exhaust: 0.35
};

const FMV_BASE: Record<PartCategory, number> = {
  Engine: 920,
  Suspension: 540,
  Transmission: 860,
  Brakes: 470,
  Rims: 620,
  Tires: 390,
  Exhaust: 520
};

const CONDITION_MULTIPLIER: Record<PartCondition, number> = {
  New: 1,
  Used: 0.72,
  Aftermarket: 0.88
};

function hashString(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function maybeExtractAskPrice(url: string): number | undefined {
  const decoded = decodeURIComponent(url);
  const match = decoded.match(/(?:\$|price[=:\-\s]?)(\d{2,6}(?:\.\d{1,2})?)/i);
  if (!match) return undefined;
  const amount = Number(match[1]);
  return Number.isFinite(amount) ? amount : undefined;
}

function confidenceFromSignals(knownSignalCount: number, urlQuality: number) {
  const score = urlQuality * 0.45 + (knownSignalCount / 4) * 0.55;
  if (score >= 0.75) return 'High';
  if (score >= 0.5) return 'Medium';
  return 'Low';
}

function buildRecommendations(risks: AnalysisRisk[], category: PartCategory) {
  const base = [
    'Request clear close-up photos including part numbers and wear points.',
    'Confirm exact fitment for your year, trim, and drivetrain before paying.',
    'Use protected payment and avoid sending deposits without verification.'
  ];

  if (category === 'Brakes' || category === 'Tires') {
    base.unshift('Ask for manufacturing date codes and remaining safe life measurements.');
  }

  if (risks.some((r) => r.message.includes('Over market'))) {
    base.unshift('Share FMV range with seller and negotiate toward the mid-range value.');
  }

  if (risks.some((r) => r.message.includes('tenure unknown'))) {
    base.push('Ask for proof of ownership and prior transaction history.');
  }

  return base.slice(0, 5);
}

export function analyzeMarketplaceListing(input: AnalysisInput): AnalysisOutput {
  const seed = hashString(`${input.url}|${input.category}|${input.condition}|${input.source}`);
  const lower = input.url.toLowerCase();

  const hasMarketplaceKeyword = /marketplace|listing|item/.test(lower);
  const hasStructuredPattern = /\/item\/|\/marketplace\/|[?&]id=|[?&]listing/i.test(input.url);
  const urlQuality = clamp((hasMarketplaceKeyword ? 0.55 : 0.25) + (hasStructuredPattern ? 0.45 : 0.2), 0, 1);

  const distanceKnown = seed % 10 > 2;
  const tenureKnown = seed % 10 > 3;
  const ratingKnown = seed % 10 > 4;
  const ageKnown = seed % 10 > 1;

  const signals: AnalysisSignal = {
    distanceMiles: distanceKnown ? 8 + (seed % 180) : undefined,
    sellerTenure: tenureKnown ? `${1 + (seed % 72)} months` : undefined,
    sellerRating: ratingKnown ? Number((3.4 + ((seed % 16) / 10)).toFixed(1)) : undefined,
    listingAge: ageKnown ? `${1 + (seed % 21)} days` : undefined
  };

  const knownSignalCount = [signals.distanceMiles, signals.sellerTenure, signals.sellerRating, signals.listingAge].filter(
    (x) => x !== undefined
  ).length;

  const askPrice = input.askPrice ?? maybeExtractAskPrice(input.url);
  const base = FMV_BASE[input.category] * CONDITION_MULTIPLIER[input.condition];
  const marketSwing = 0.92 + ((seed % 19) / 100);
  const fmvMid = Math.round(base * marketSwing);
  const fairMarketValue = {
    low: Math.round(fmvMid * 0.88),
    mid: fmvMid,
    high: Math.round(fmvMid * 1.14),
    deltaPct: askPrice ? Number((((askPrice - fmvMid) / fmvMid) * 100).toFixed(1)) : undefined,
    signal: 'Unknown' as const
  };

  if (askPrice != null) {
    if (askPrice < fairMarketValue.mid * 0.9) fairMarketValue.signal = 'Under market';
    else if (askPrice > fairMarketValue.mid * 1.1) fairMarketValue.signal = 'Over market';
    else fairMarketValue.signal = 'At market';
  }

  const riskCategoryWeight = RISK_WEIGHT[input.category];
  const distanceRisk = signals.distanceMiles == null ? 0.18 : clamp((signals.distanceMiles - 70) / 180, 0, 0.22);
  const tenureRisk = signals.sellerTenure == null ? 0.22 : (Number(signals.sellerTenure.split(' ')[0]) < 6 ? 0.2 : 0.05);

  let priceRisk = 0.18;
  if (askPrice != null) {
    const ratio = askPrice / fairMarketValue.mid;
    if (ratio > 1.55) priceRisk = 0.62;
    else if (ratio > 1.35) priceRisk = 0.5;
    else if (ratio > 1.15) priceRisk = 0.34;
    else if (ratio < 0.75) priceRisk = 0.28;
    else priceRisk = 0.12;
  }

  const uncertaintyRisk = clamp((4 - knownSignalCount) * 0.07, 0.05, 0.28);

  const totalRisk = clamp(
    riskCategoryWeight * 0.32 + distanceRisk + tenureRisk + priceRisk + uncertaintyRisk,
    0.08,
    0.95
  );

  let score = (1 - totalRisk) * 10;

  if (askPrice != null && askPrice > fairMarketValue.high) {
    score = Math.min(score, 4.7);
  }
  if (askPrice != null && askPrice / fairMarketValue.mid >= 1.35) {
    score = Math.min(score, 3.8);
  }

  score = Number(clamp(score, 1, 9.8).toFixed(1));

  const risks: AnalysisRisk[] = [];
  if (fairMarketValue.signal === 'Over market') {
    risks.push({ level: 'high', message: 'Over market: ask price is above estimated fair value.' });
  }
  if (!signals.sellerTenure) {
    risks.push({ level: 'medium', message: 'Seller tenure unknown from this listing link.' });
  }
  if ((signals.distanceMiles ?? 0) > 100) {
    risks.push({ level: 'medium', message: 'Long pickup distance increases transaction risk.' });
  }
  if (input.category === 'Brakes' || input.category === 'Tires') {
    risks.push({ level: 'high', message: `High-risk part category: ${input.category}.` });
  }
  if (!hasStructuredPattern) {
    risks.push({ level: 'medium', message: 'Listing link has limited metadata structure; confidence reduced.' });
  }

  const confidence = confidenceFromSignals(knownSignalCount, urlQuality);

  return {
    score,
    confidence,
    signals,
    risks,
    recommendations: buildRecommendations(risks, input.category),
    askPrice,
    fairMarketValue
  };
}
