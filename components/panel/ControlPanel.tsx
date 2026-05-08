'use client';

import type { Category, Lang } from '@/lib/types';
import { CategoryGrid } from './CategoryGrid';
import { LangToggle } from './LangToggle';
import { HomeButton } from './HomeButton';

interface Props {
  active: Set<Category>;
  onToggleCategory: (c: Category) => void;
  lang: Lang;
  onToggleLang: () => void;
  onHome: () => void;
  showArchiveLink?: boolean;
}

export function ControlPanel({
  active,
  onToggleCategory,
  lang,
  onToggleLang,
  onHome,
  showArchiveLink,
}: Props) {
  return (
    <div className="container-2 flex flex-col gap-6">
      <CategoryGrid active={active} onToggle={onToggleCategory} />
      <div className="flex flex-col gap-3 items-start">
        <LangToggle lang={lang} onToggle={onToggleLang} />
        <HomeButton onHome={onHome} />
        {showArchiveLink && (
          <a href="/archive/" className="text-xs opacity-60 mt-4">
            previous version →
          </a>
        )}
      </div>
    </div>
  );
}
