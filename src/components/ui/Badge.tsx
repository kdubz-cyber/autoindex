import { HTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

type Tone = 'neutral' | 'good' | 'warn' | 'danger' | 'info';

const toneMap: Record<Tone, string> = {
  neutral: 'bg-[#e7f3ff] text-zinc-800 border-[#dbe3ef]',
  good: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  warn: 'bg-amber-50 text-amber-900 border-amber-200',
  danger: 'bg-rose-50 text-rose-900 border-rose-200',
  info: 'bg-[#e7f3ff] text-[#1b4f9c] border-[#dbe3ef]'
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
