export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-primary/40 bg-bg-elevated p-8 text-center shadow-[0_0_24px_oklch(0.72_0.22_25_/_0.3)]">
        <h2 className="font-display text-[64px] font-bold text-accent-4">404</h2>
        <p className="font-body text-[20px] text-text-muted mb-6">Page not found.</p>
        <a
          href="/"
          className="rounded-full bg-primary px-8 py-3 font-display text-[20px] font-bold text-bg-deep transition-transform hover:scale-105"
        >
          RETURN HOME
        </a>
      </div>
    </div>
  );
}
