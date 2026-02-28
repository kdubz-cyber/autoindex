import { HTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx('animate-pulse rounded-[var(--radius-input)] bg-zinc-200/80 motion-reduce:animate-none', className)}
      {...props}
    />
  );
}
