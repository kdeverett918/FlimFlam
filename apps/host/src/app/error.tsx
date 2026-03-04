"use client";

export default function ErrorPage({
  // error, // unused
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="bg-white/[0.10] border border-white/[0.15] backdrop-blur-xl backdrop-saturate-[1.2] rounded-2xl flex flex-col items-center p-8 text-center border-destructive max-w-md w-full">
        <h2 className="font-display text-[48px] font-bold text-destructive">ERROR</h2>
        <p className="font-body text-[18px] text-text-muted mb-6">Something went wrong.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-destructive px-8 py-3 font-display text-[20px] font-bold text-white transition-transform hover:scale-105"
        >
          TRY AGAIN
        </button>
      </div>
    </div>
  );
}
