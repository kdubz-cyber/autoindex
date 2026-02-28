import { HTMLAttributes, ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cx } from '../../lib/cx';

type AlertTone = 'error' | 'warn' | 'info' | 'success';

const styles: Record<AlertTone, string> = {
  error: 'border-rose-200 bg-rose-50 text-rose-900',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900'
};

const icons: Record<AlertTone, ReactNode> = {
  error: <AlertCircle className="mt-0.5 h-4 w-4" />,
  warn: <AlertTriangle className="mt-0.5 h-4 w-4" />,
  info: <Info className="mt-0.5 h-4 w-4" />,
  success: <CheckCircle2 className="mt-0.5 h-4 w-4" />
};

export function Alert({ tone = 'info', className, children, ...props }: HTMLAttributes<HTMLDivElement> & { tone?: AlertTone }) {
  return (
    <div
      role="status"
      className={cx('flex items-start gap-2 rounded-[var(--radius-input)] border px-3 py-2 text-sm', styles[tone], className)}
      {...props}
    >
      {icons[tone]}
      <div>{children}</div>
    </div>
  );
}
