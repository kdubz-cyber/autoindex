import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

type Props = {
  onNavigate: (path: string) => void;
};

export function HomePage({ onNavigate }: Props) {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0b1220] p-6 text-white md:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#dbe9ff]">Marketplace Analysis</p>
            <h1 className="mt-2 text-[28px] font-bold leading-[1.15]">Know if a listing is fair before you buy</h1>
            <p className="mt-3 text-base leading-6 text-zinc-200">
              AutoIndex combines fair market value logic, risk signals, and deterministic confidence scoring so buyers can
              evaluate listings quickly.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => onNavigate('/analysis')}>
                Start analysis <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="secondary" onClick={() => onNavigate('/about')}>
                Learn how it works
              </Button>
              <Button variant="ghost" onClick={() => onNavigate('/workspace')}>
                Open full workspace
              </Button>
            </div>
          </div>
          <div className="bg-[#f0f2f5] p-6 md:p-8">
            <h2 className="text-[20px] font-semibold leading-7 text-[var(--color-text)]">3-step product flow</h2>
            <ol className="mt-4 space-y-3">
              {[
                'Choose part category and condition',
                'Paste listing URL and optional ask price',
                'Review score, risks, FMV, and recommendations'
              ].map((line, idx) => (
                <li key={line} className="flex items-start gap-3 text-sm text-zinc-700">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-white">
                    {idx + 1}
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
            <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
            Deterministic analysis
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Every URL and part category resolves to a consistent result for reliable demos and stakeholder reviews.
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
            <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />
            Buyer-first risk flags
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Highlights unknown tenure, long-distance pickup friction, and over-market price positioning.
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
            <CheckCircle2 className="h-4 w-4 text-[var(--color-primary)]" />
            Wix-ready template mode
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Core flow works in static mode now and can connect to a backend API later without redesign.
          </p>
        </Card>
      </div>
    </div>
  );
}
