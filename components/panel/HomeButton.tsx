'use client';

import { useRouter } from 'next/navigation';

export function HomeButton({ onHome }: { onHome?: () => void }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-sm tracking-wider"
      onClick={() => {
        onHome?.();
        router.push('/');
      }}
    >
      Home
    </button>
  );
}
