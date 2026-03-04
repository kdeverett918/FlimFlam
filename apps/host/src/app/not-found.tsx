export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="bg-white/[0.10] border border-white/[0.15] backdrop-blur-xl backdrop-saturate-[1.2] rounded-2xl flex flex-col items-center p-8 text-center border-primary max-w-md w-full">
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
