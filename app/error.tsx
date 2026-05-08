'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl">Something went wrong.</h1>
      <button type="button" onClick={() => reset()} className="underline">
        Try again
      </button>
    </div>
  );
}
