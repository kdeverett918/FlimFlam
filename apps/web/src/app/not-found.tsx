export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-white/[0.15] bg-white/[0.10] p-8 text-center backdrop-blur-xl backdrop-saturate-[1.2]">
        <h2 className="font-display text-7xl font-bold text-accent-4">404</h2>
        <p className="mb-6 font-body text-xl text-text-muted">Page not found.</p>
        <a
          href="/"
          className="rounded-full bg-primary px-8 py-3 font-display text-xl font-bold text-bg-deep transition-transform hover:scale-105"
        >
          RETURN HOME
        </a>
      </div>
    </div>
  );
}
