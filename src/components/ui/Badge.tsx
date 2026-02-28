import { HTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

type Tone = 'neutral' | 'good' | 'warn' | 'danger' | 'info';

const toneMap: Record<Tone, string> = {
  neutral: 'bg-zinc-100 text-zinc-800 border-zinc-200',
  good: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  warn: 'bg-amber-50 text-amber-900 border-amber-200',
  danger: 'bg-rose-50 text-rose-900 border-rose-200',
  info: 'bg-blue-50 text-blue-900 border-blue-200'
};

export function Badge({
  className,
  children,
  tone = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
        toneMap[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
