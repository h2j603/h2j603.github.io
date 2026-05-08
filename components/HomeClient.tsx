'use client';

import { useCallback, useState } from 'react';
import type { Work, Category } from '@/lib/types';
import { useLanguage } from '@/hooks/useLanguage';
import { WorkGrid } from '@/components/grid/WorkGrid';
import { ControlPanel } from '@/components/panel/ControlPanel';

export function HomeClient({
  works,
  showArchiveLink,
}: {
  works: Work[];
  showArchiveLink: boolean;
}) {
  const { lang, toggle: toggleLang } = useLanguage();
  const [active, setActive] = useState<Set<Category>>(new Set());

  const onToggleCategory = useCallback((c: Category) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      // 5 selected → clear all
      if (next.size === 5) return new Set();
      return next;
    });
  }, []);

  const onHome = useCallback(() => {
    setActive(new Set());
  }, []);

  return (
    <div className="containers">
      <div className="container-1">
        <WorkGrid works={works} activeCategories={active} lang={lang} />
      </div>
      <ControlPanel
        active={active}
        onToggleCategory={onToggleCategory}
        lang={lang}
        onToggleLang={toggleLang}
        onHome={onHome}
        showArchiveLink={showArchiveLink}
      />
    </div>
  );
}
