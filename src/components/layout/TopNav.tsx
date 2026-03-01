import { cx } from '../../lib/cx';

type NavItem = {
  label: string;
  path: string;
};

type Props = {
  navItems: NavItem[];
  currentPath: string;
  onNavigate: (path: string) => void;
  embedMode: boolean;
};

export function TopNav({ navItems, currentPath, onNavigate, embedMode }: Props) {
  if (embedMode) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-4 py-3 md:px-6">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="focus-ring inline-flex items-center gap-2 rounded-[var(--radius-input)] px-2 py-1 text-left"
          aria-label="Go to home"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-primary)] text-sm font-bold text-white">
            AI
          </span>
          <span>
            <span className="block text-base font-semibold leading-5 text-[var(--color-text)]">AutoIndex</span>
            <span className="block text-xs text-zinc-600">Marketplace valuation intelligence</span>
          </span>
        </button>

        <nav aria-label="Primary" className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => onNavigate(item.path)}
              className={cx(
                'focus-ring rounded-[var(--radius-input)] px-3 py-2 text-sm font-medium transition-colors',
                currentPath === item.path
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-zinc-700 hover:bg-[#e7f3ff]'
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <span className="text-xs font-medium text-zinc-500 md:hidden">Navigation</span>
      </div>

      <nav aria-label="Mobile primary" className="mx-auto grid max-w-[1180px] grid-cols-3 gap-1 px-4 pb-3 md:hidden">
        {navItems.map((item) => (
          <button
            key={item.path}
            type="button"
            onClick={() => onNavigate(item.path)}
            className={cx(
              'focus-ring rounded-[var(--radius-input)] px-2 py-2 text-xs font-semibold',
              currentPath === item.path ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-zinc-700'
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
