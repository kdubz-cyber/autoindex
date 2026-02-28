export function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 text-zinc-700">
      <h1 className="text-[28px] font-bold leading-[1.15] text-[var(--color-text)]">Privacy Policy</h1>
      <p className="text-sm text-zinc-500">Last updated: February 28, 2026</p>
      <p className="text-base leading-7">
        AutoIndex processes listing URLs and form input provided by users to generate valuation guidance. In template mode,
        account/session data is stored only in your browser local storage.
      </p>
      <h2 className="text-[20px] font-semibold leading-7 text-[var(--color-text)]">Data Collected</h2>
      <p className="text-base leading-7">We may store account username, role, saved items, and analysis inputs necessary to provide product functionality.</p>
      <h2 className="text-[20px] font-semibold leading-7 text-[var(--color-text)]">How Data Is Used</h2>
      <p className="text-base leading-7">Data is used to run marketplace analysis, preserve user progress, and improve risk and valuation recommendations.</p>
      <h2 className="text-[20px] font-semibold leading-7 text-[var(--color-text)]">Your Controls</h2>
      <p className="text-base leading-7">You can clear browser storage at any time to remove local template-mode account and session data.</p>
      <h2 className="text-[20px] font-semibold leading-7 text-[var(--color-text)]">Contact</h2>
      <p className="text-base leading-7">For privacy requests, contact the site owner through the official support channel.</p>
    </article>
  );
}
