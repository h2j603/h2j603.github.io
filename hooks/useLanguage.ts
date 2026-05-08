'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Lang } from '@/lib/types';

const STORAGE_KEY = 'hyuk-lang';

export function useLanguage(): { lang: Lang; setLang: (l: Lang) => void; toggle: () => void } {
  const [lang, setLangState] = useState<Lang>('kr');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'kr' || stored === 'en') setLangState(stored);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const toggle = useCallback(() => {
    setLangState((prev) => {
      const next = prev === 'kr' ? 'en' : 'kr';
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { lang, setLang, toggle };
}
