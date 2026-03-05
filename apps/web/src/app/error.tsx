"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-white/[0.15] bg-white/[0.10] p-8 text-center backdrop-blur-xl backdrop-saturate-[1.2]">
        <h2 className="font-display text-5xl font-bold text-destructive">ERROR</h2>
        <p className="mb-6 font-body text-lg text-text-muted">Something went wrong.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-destructive px-8 py-3 font-display text-xl font-bold text-white transition-transform hover:scale-105"
        >
          TRY AGAIN
        </button>
      </div>
    </div>
  );
}
