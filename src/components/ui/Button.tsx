import { ButtonHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-strong)]',
  secondary: 'bg-white text-[var(--color-text)] border border-[var(--color-border)] hover:bg-zinc-50',
  ghost: 'bg-transparent text-[var(--color-text)] hover:bg-zinc-100',
  destructive: 'bg-[var(--color-danger)] text-white hover:bg-red-700'
};

export function Button({
  variant = 'primary',
  fullWidth = false,
  className,
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cx(
        'focus-ring inline-flex items-center justify-center gap-2 rounded-[var(--radius-input)] px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55',
        variantStyles[variant],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    />
  );
}
