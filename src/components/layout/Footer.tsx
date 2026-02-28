import { Button } from '../ui/Button';

type Props = {
  embedMode: boolean;
  onNavigate: (path: string) => void;
};

export function Footer({ embedMode, onNavigate }: Props) {
  if (embedMode) return null;

  return (
    <footer className="border-t border-[var(--color-border)] bg-white">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-3 px-4 py-6 text-sm text-zinc-600 md:flex-row md:items-center md:justify-between md:px-6">
        <p>AutoIndex MVP template. Deterministic analysis for demo readiness.</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="px-2 py-1 text-sm" onClick={() => onNavigate('/privacy')}>
            Privacy
          </Button>
          <Button variant="ghost" className="px-2 py-1 text-sm" onClick={() => onNavigate('/terms')}>
            Terms
          </Button>
          <Button variant="ghost" className="px-2 py-1 text-sm" onClick={() => onNavigate('/workspace')}>
            Full Workspace
          </Button>
        </div>
      </div>
    </footer>
  );
}
