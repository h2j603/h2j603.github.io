'use client';

import type { Lang } from '@/lib/types';

export function LangToggle({ lang, onToggle }: { lang: Lang; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="text-sm tracking-wider"
      onClick={onToggle}
      aria-label="Toggle language"
    >
      <span className={lang === 'kr' ? 'underline' : ''}>KR</span>
      <span className="mx-1">/</span>
      <span className={lang === 'en' ? 'underline' : ''}>EN</span>
    </button>
  );
}
