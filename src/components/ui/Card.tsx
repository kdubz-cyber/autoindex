import { HTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-soft)]',
        className
      )}
      {...props}
    />
  );
}
