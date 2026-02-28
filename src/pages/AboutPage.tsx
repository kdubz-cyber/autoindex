import { Card } from '../components/ui/Card';

export function AboutPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-[28px] font-bold leading-[1.15] text-[var(--color-text)]">About AutoIndex</h1>
      <p className="max-w-3xl text-base leading-7 text-zinc-700">
        AutoIndex is designed to help enthusiasts and buyers evaluate marketplace part listings with a repeatable process:
        validate the listing link, apply fair market value assumptions, then review risk and confidence before purchase.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-[20px] font-semibold leading-7 text-[var(--color-text)]">Methodology</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            The score blends part-category risk, data completeness, FMV comparison, and seller-context signals. Unknown
            signals lower confidence to avoid overstating certainty.
          </p>
        </Card>
        <Card>
          <h2 className="text-[20px] font-semibold leading-7 text-[var(--color-text)]">Deployment</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            The app supports GitHub Pages base paths and root-path deployment for custom domains. It also includes an
            embed mode for Wix iframe usage.
          </p>
        </Card>
      </div>
    </div>
  );
}
