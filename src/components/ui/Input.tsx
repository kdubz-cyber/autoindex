import { InputHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

export function Input({ id, label, error, hint, className, ...props }: Props) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[var(--color-text)]">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cx(
          'focus-ring w-full rounded-[var(--radius-input)] border bg-white px-3 py-2.5 text-base text-[var(--color-text)] outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:bg-[#e7f3ff]',
          error ? 'border-rose-300' : 'border-[var(--color-border)]',
          className
        )}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-rose-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-zinc-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
