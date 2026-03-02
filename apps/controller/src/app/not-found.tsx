import { GlassPanel } from "@flimflam/ui";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <GlassPanel
        glow
        rounded="2xl"
        className="flex flex-col items-center p-8 text-center border-primary max-w-md w-full"
      >
        <h2 className="font-display text-[64px] font-bold text-accent-4">404</h2>
        <p className="font-body text-[20px] text-text-muted mb-6">Page not found.</p>
        <Link
          href="/"
          className="rounded-full bg-primary px-8 py-3 font-display text-[20px] font-bold text-bg-deep transition-transform hover:scale-105"
        >
          RETURN HOME
        </Link>
      </GlassPanel>
    </div>
  );
}
