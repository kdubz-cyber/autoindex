import { Check } from 'lucide-react';
import { cx } from '../../lib/cx';

type Step = {
  id: number;
  label: string;
};

type Props = {
  steps: Step[];
  activeStep: number;
  onStepChange: (step: number) => void;
};

export function Stepper({ steps, activeStep, onStepChange }: Props) {
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Analysis steps">
      {steps.map((step) => {
        const complete = step.id < activeStep;
        const active = step.id === activeStep;
        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => onStepChange(step.id)}
              className={cx(
                'focus-ring flex w-full items-center gap-2 rounded-[var(--radius-input)] border px-2 py-2 text-left text-sm transition-colors',
                complete && 'border-emerald-300 bg-emerald-50 text-emerald-900',
                active && 'border-[var(--color-primary)] bg-[#e7f3ff] text-[#1b4f9c]',
                !active && !complete && 'border-[var(--color-border)] bg-white text-zinc-700 hover:bg-[#eef3fb]'
              )}
              aria-current={active ? 'step' : undefined}
            >
              <span
                className={cx(
                  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                  complete && 'border-emerald-600 bg-emerald-600 text-white',
                  active && 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white',
                  !active && !complete && 'border-zinc-300 text-zinc-600'
                )}
              >
                {complete ? <Check className="h-3.5 w-3.5" /> : step.id}
              </span>
              <span className="truncate">{step.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
