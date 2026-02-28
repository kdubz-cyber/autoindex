import { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Info, Loader2, RefreshCw } from 'lucide-react';
import { PART_CATEGORIES, PART_CONDITIONS, MARKET_SOURCES, PartCategory, PartCondition, MarketSource } from '../lib/constants';
import { parseUrl } from '../lib/url';
import { AnalysisOutput, AnalysisRisk, analyzeMarketplaceListing } from '../lib/analysisEngine';
import { Stepper } from '../components/analysis/Stepper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';

type AnalysisStatus = 'idle' | 'loading' | 'success' | 'partial' | 'error';

type PersistedAnalysisForm = {
  category: PartCategory;
  condition: PartCondition;
  source: MarketSource;
  url: string;
  askPrice: string;
};

const FORM_STORAGE_KEY = 'autoindex_analysis_form';

const defaultForm: PersistedAnalysisForm = {
  category: 'Engine',
  condition: 'Used',
  source: 'Facebook Marketplace',
  url: '',
  askPrice: ''
};

function scoreLabel(score: number) {
  if (score >= 8.5) return { text: 'Excellent alignment', tone: 'good' as const };
  if (score >= 7) return { text: 'Good alignment', tone: 'info' as const };
  if (score >= 5) return { text: 'Use caution', tone: 'warn' as const };
  return { text: 'High risk', tone: 'danger' as const };
}

function riskTone(level: AnalysisRisk['level']) {
  if (level === 'high') return 'danger' as const;
  if (level === 'medium') return 'warn' as const;
  return 'info' as const;
}

function displayOrUnknown(value: string | number | undefined) {
  if (value == null) {
    return (
      <span className="inline-flex items-center gap-1" title="Not available from this link">
        — <Info className="h-3.5 w-3.5 text-zinc-400" />
      </span>
    );
  }
  return <span>{value}</span>;
}

export function MarketplaceAnalysisPage() {
  const [form, setForm] = useState<PersistedAnalysisForm>(() => {
    try {
      const raw = localStorage.getItem(FORM_STORAGE_KEY);
      if (!raw) return defaultForm;
      return { ...defaultForm, ...(JSON.parse(raw) as Partial<PersistedAnalysisForm>) };
    } catch {
      return defaultForm;
    }
  });

  const [activeStep, setActiveStep] = useState(1);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [urlError, setUrlError] = useState<string>('');
  const [globalError, setGlobalError] = useState<string>('');
  const [result, setResult] = useState<AnalysisOutput | null>(null);
  const [liveMessage, setLiveMessage] = useState('Analysis ready.');

  useEffect(() => {
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  const parsedAskPrice = useMemo(() => {
    const n = Number(form.askPrice.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [form.askPrice]);

  const parsedUrl = useMemo(() => parseUrl(form.url), [form.url]);
  const canAnalyse = parsedUrl.isValid && status !== 'loading';

  const runAnalysis = async () => {
    const check = parseUrl(form.url);
    if (!check.isValid) {
      setUrlError(check.error ?? 'Invalid URL.');
      setStatus('error');
      setGlobalError('Fix URL issues before running analysis.');
      setLiveMessage('Analysis failed due to invalid URL.');
      setActiveStep(2);
      return;
    }

    setUrlError('');
    setGlobalError('');
    setStatus('loading');
    setActiveStep(3);

    const started = Date.now();
    try {
      const output = analyzeMarketplaceListing({
        url: check.normalized!,
        category: form.category,
        condition: form.condition,
        source: form.source,
        askPrice: parsedAskPrice
      });

      const elapsed = Date.now() - started;
      if (elapsed < 650) {
        await new Promise((resolve) => setTimeout(resolve, 650 - elapsed));
      }

      setResult(output);
      const unknownCount = [output.signals.distanceMiles, output.signals.sellerTenure, output.signals.sellerRating, output.signals.listingAge].filter(
        (x) => x == null
      ).length;
      const nextStatus: AnalysisStatus = output.confidence === 'Low' || unknownCount > 0 ? 'partial' : 'success';
      setStatus(nextStatus);
      setLiveMessage(`Analysis complete. Score ${output.score} out of 10 with ${output.confidence} confidence.`);
    } catch {
      setStatus('error');
      setGlobalError('Unable to analyze this listing right now. Try another link or reset the form.');
      setLiveMessage('Analysis failed.');
    }
  };

  const resetAll = () => {
    setForm(defaultForm);
    setResult(null);
    setStatus('idle');
    setUrlError('');
    setGlobalError('');
    setActiveStep(1);
    setLiveMessage('Analysis reset.');
    localStorage.removeItem(FORM_STORAGE_KEY);
  };

  const copyQuestions = async () => {
    const content = [
      'Can you share clear photos of serial/part numbers?',
      'Has this part been repaired or modified?',
      'Can you confirm fitment for my exact year/trim?',
      'Can you provide proof of purchase or ownership?'
    ].join('\n');
    try {
      await navigator.clipboard.writeText(content);
      setLiveMessage('Seller questions copied to clipboard.');
    } catch {
      setLiveMessage('Copy failed.');
    }
  };

  const summaryLabel = result ? scoreLabel(result.score) : null;

  return (
    <section className="space-y-4 pb-24 md:pb-6">
      <div aria-live="polite" className="sr-only">
        {liveMessage}
      </div>

      <Card className="space-y-4">
        <h1 className="text-[28px] font-bold leading-[1.15] text-[var(--color-text)]">Marketplace Analysis</h1>
        <p className="text-base leading-6 text-zinc-700">
          Select part details, paste a listing link, and run analysis for a fair market value comparison with risk context.
        </p>
        <Stepper
          steps={[
            { id: 1, label: 'Choose part' },
            { id: 2, label: 'Paste link' },
            { id: 3, label: 'Results' }
          ]}
          activeStep={activeStep}
          onStepChange={setActiveStep}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <Card className={activeStep === 1 ? 'ring-1 ring-blue-200' : ''}>
            <h2 className="text-[20px] font-semibold leading-7 text-[var(--color-text)]">Step 1: Choose Part</h2>
            <p className="mt-1 text-sm text-zinc-600">Pick category and condition before link analysis.</p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {PART_CATEGORIES.map((part) => {
                const selected = form.category === part.id;
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, category: part.id }))}
                    className={`focus-ring rounded-[var(--radius-card)] border p-3 text-left transition-colors ${
                      selected
                        ? 'border-[var(--color-primary)] bg-blue-50'
                        : 'border-[var(--color-border)] bg-white hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                      <part.Icon className="h-4 w-4 text-[var(--color-primary)]" />
                      {part.label}
                    </div>
                    <p className="mt-1 text-xs text-zinc-600">{part.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <Select
                id="condition"
                label="Condition"
                value={form.condition}
                onChange={(e) => setForm((prev) => ({ ...prev, condition: e.target.value as PartCondition }))}
                options={PART_CONDITIONS.map((c) => ({ value: c, label: c }))}
              />
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={() => setActiveStep(2)}>
                Continue to link
              </Button>
            </div>
          </Card>

          <Card className={activeStep === 2 ? 'ring-1 ring-blue-200' : ''}>
            <h2 className="text-[20px] font-semibold leading-7 text-[var(--color-text)]">Step 2: Paste Listing Link</h2>
            <p className="mt-1 text-sm text-zinc-600">URL must be valid http/https. Ask price is optional but improves FMV comparison.</p>

            <div className="mt-4 grid gap-3">
              <Select
                id="source"
                label="Source"
                value={form.source}
                onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value as MarketSource }))}
                options={MARKET_SOURCES.map((s) => ({ value: s, label: s }))}
              />
              <Input
                id="listing-url"
                label="Listing URL"
                placeholder="https://www.facebook.com/marketplace/item/..."
                value={form.url}
                onBlur={() => {
                  const checked = parseUrl(form.url);
                  setUrlError(checked.isValid ? '' : checked.error ?? 'Invalid URL.');
                }}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, url: e.target.value }));
                  if (urlError) setUrlError('');
                }}
                error={urlError}
              />
              <Input
                id="ask-price"
                label="Ask Price (optional)"
                inputMode="decimal"
                placeholder="350"
                value={form.askPrice}
                onChange={(e) => setForm((prev) => ({ ...prev, askPrice: e.target.value }))}
                hint="If empty, AutoIndex estimates from deterministic listing patterns."
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={runAnalysis} disabled={!canAnalyse}>
                {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Analyse listing
              </Button>
              <Button variant="secondary" onClick={resetAll}>
                <RefreshCw className="h-4 w-4" /> Reset
              </Button>
              {parsedUrl.isValid && parsedUrl.normalized ? (
                <Button variant="ghost" onClick={() => window.open(parsedUrl.normalized, '_blank', 'noopener,noreferrer')}>
                  Open link <ExternalLink className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="space-y-4" id="analysis-results">
          {status === 'idle' ? (
            <Card>
              <h2 className="text-[20px] font-semibold leading-7 text-[var(--color-text)]">Step 3: Results</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-700">
                Run analysis to view score, confidence, risk flags, recommendations, and fair market value comparison.
              </p>
            </Card>
          ) : null}

          {status === 'loading' ? (
            <Card className="space-y-3">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-6 w-48" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
              <Skeleton className="h-28 w-full" />
            </Card>
          ) : null}

          {status === 'error' ? (
            <Alert tone="error">{globalError || 'Analysis failed. Please check the listing input and retry.'}</Alert>
          ) : null}

          {(status === 'success' || status === 'partial') && result ? (
            <>
              {status === 'partial' ? (
                <Alert tone="warn">Partial data available. Some signals were not extractable from this link.</Alert>
              ) : null}

              <Card className="space-y-4" aria-live="polite">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-600">Score</p>
                    <p className="text-4xl font-bold leading-none text-[var(--color-text)]">{result.score.toFixed(1)}/10</p>
                    {summaryLabel ? <Badge tone={summaryLabel.tone}>{summaryLabel.text}</Badge> : null}
                  </div>
                  <Badge tone={result.confidence === 'High' ? 'good' : result.confidence === 'Medium' ? 'warn' : 'danger'}>
                    Confidence: {result.confidence}
                  </Badge>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Card className="p-3">
                    <p className="text-xs font-semibold text-zinc-500">Distance</p>
                    <p className="text-base font-semibold text-[var(--color-text)]">{displayOrUnknown(result.signals.distanceMiles != null ? `${result.signals.distanceMiles} mi` : undefined)}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs font-semibold text-zinc-500">Seller tenure</p>
                    <p className="text-base font-semibold text-[var(--color-text)]">{displayOrUnknown(result.signals.sellerTenure)}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs font-semibold text-zinc-500">Seller rating</p>
                    <p className="text-base font-semibold text-[var(--color-text)]">{displayOrUnknown(result.signals.sellerRating)}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs font-semibold text-zinc-500">Listing age</p>
                    <p className="text-base font-semibold text-[var(--color-text)]">{displayOrUnknown(result.signals.listingAge)}</p>
                  </Card>
                </div>

                <Card className="p-3">
                  <p className="text-sm font-semibold text-[var(--color-text)]">Fair Market Value</p>
                  <p className="mt-1 text-sm text-zinc-700">
                    Estimated range: <strong>${result.fairMarketValue.low}</strong> - <strong>${result.fairMarketValue.high}</strong> (mid: ${result.fairMarketValue.mid})
                  </p>
                  <p className="mt-1 text-sm text-zinc-700">
                    Ask price: <strong>{result.askPrice != null ? `$${result.askPrice}` : '—'}</strong> • Signal:{' '}
                    <Badge tone={result.fairMarketValue.signal === 'Over market' ? 'danger' : result.fairMarketValue.signal === 'Under market' ? 'good' : 'neutral'}>
                      {result.fairMarketValue.signal}
                    </Badge>
                  </p>
                </Card>
              </Card>

              <Card>
                <h3 className="text-[20px] font-semibold leading-7 text-[var(--color-text)]">Risk Flags</h3>
                <ul className="mt-3 space-y-2">
                  {result.risks.map((risk) => (
                    <li key={risk.message} className="flex items-start gap-2 text-sm text-zinc-700">
                      <Badge tone={riskTone(risk.level)}>{risk.level}</Badge>
                      <span>{risk.message}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card>
                <h3 className="text-[20px] font-semibold leading-7 text-[var(--color-text)]">Recommendations</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700">
                  {result.recommendations.map((rec) => (
                    <li key={rec}>{rec}</li>
                  ))}
                </ul>

                <div className="mt-4 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-zinc-50 p-3">
                  <p className="text-sm font-semibold text-[var(--color-text)]">Questions to ask the seller</p>
                  <p className="mt-1 text-sm text-zinc-700">Use this checklist before payment.</p>
                  <Button variant="secondary" className="mt-3" onClick={copyQuestions}>
                    <Copy className="h-4 w-4" /> Copy questions
                  </Button>
                </div>
              </Card>

              <Card>
                <h3 className="text-[20px] font-semibold leading-7 text-[var(--color-text)]">Comparables</h3>
                <Alert tone="info" className="mt-3">
                  Comparables coming soon. Layout is reserved for live market comp integration.
                </Alert>
              </Card>
            </>
          ) : null}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-border)] bg-white/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto flex w-full max-w-[1180px] gap-2">
          <Button onClick={runAnalysis} disabled={!canAnalyse} fullWidth>
            Analyse
          </Button>
          <Button variant="secondary" onClick={resetAll} fullWidth>
            Reset
          </Button>
        </div>
      </div>
    </section>
  );
}
