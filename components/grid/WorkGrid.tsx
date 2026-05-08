'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Work, Category, Lang } from '@/lib/types';
import { useSettings } from '@/components/shared/SiteShell';
import { splitTitleIntoCells, columnForWork, paginateWorks } from '@/lib/grid-utils';
import { localizedTitle } from '@/lib/i18n';
import { GridCell } from './GridCell';

interface WorkGridProps {
  works: Work[];
  activeCategories: Set<Category>;
  lang: Lang;
}

export function WorkGrid({ works, activeCategories, lang }: WorkGridProps) {
  const settings = useSettings();
  const router = useRouter();
  const gridSize = settings.grid.size;
  const emptyStyle = settings.grid.emptyCellStyle;

  const filtered = useMemo(() => {
    if (activeCategories.size === 0) return works;
    return works.filter((w) =>
      w.categories.some((c) => activeCategories.has(c))
    );
  }, [works, activeCategories]);

  const pages = useMemo(() => paginateWorks(filtered, gridSize), [filtered, gridSize]);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [activeCategories]);

  const currentPage = pages[Math.min(pageIndex, pages.length - 1)] ?? [];
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const goPrev = useCallback(() => {
    setPageIndex((i) => Math.max(0, i - 1));
  }, []);
  const goNext = useCallback(() => {
    setPageIndex((i) => Math.min(pages.length - 1, i + 1));
  }, [pages.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext]);

  // Build a column-indexed array of works, leftmost column 0 → rightmost gridSize-1
  const worksByCol: (Work | null)[] = Array(gridSize).fill(null);
  currentPage.forEach((w, idx) => {
    worksByCol[columnForWork(idx, gridSize)] = w;
  });

  const cells: React.ReactNode[] = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const work = worksByCol[col];
      if (work) {
        const chars = splitTitleIntoCells(localizedTitle(work, lang), gridSize);
        const ch = chars[row];
        cells.push(
          <GridCell
            key={`${row}-${col}`}
            emptyStyle={emptyStyle}
            active={hoverCol === col}
            onMouseEnter={() => setHoverCol(col)}
            onMouseLeave={() => setHoverCol(null)}
            onClick={() => router.push(`/works/${work.slug}`)}
            className="work-column-cell"
            role="button"
            ariaLabel={localizedTitle(work, lang)}
          >
            {ch || ''}
          </GridCell>
        );
      } else {
        cells.push(
          <GridCell key={`${row}-${col}`} emptyStyle={emptyStyle} />
        );
      }
    }
  }

  return (
    <div className="relative w-full">
      <div className="work-grid">{cells}</div>
      {pages.length > 1 && (
        <div className="flex justify-between mt-4 select-none">
          <button
            type="button"
            onClick={goPrev}
            disabled={pageIndex === 0}
            className="px-2 py-1 disabled:opacity-30"
            aria-label="Previous page"
          >
            ←
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={pageIndex >= pages.length - 1}
            className="px-2 py-1 disabled:opacity-30"
            aria-label="Next page"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
