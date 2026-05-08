'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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

  // Column-indexed array. Works fill from the rightmost column toward the left.
  const worksByCol: (Work | null)[] = Array(gridSize).fill(null);
  currentPage.forEach((w, idx) => {
    worksByCol[columnForWork(idx, gridSize)] = w;
  });

  // Decorative cells: 81 boxes that show borders + characters but receive no events.
  const cells: React.ReactNode[] = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const work = worksByCol[col];
      if (work) {
        const chars = splitTitleIntoCells(localizedTitle(work, lang), gridSize);
        cells.push(
          <GridCell
            key={`${row}-${col}`}
            emptyStyle={emptyStyle}
            active={hoverCol === col}
          >
            {chars[row] || ''}
          </GridCell>
        );
      } else {
        cells.push(<GridCell key={`${row}-${col}`} emptyStyle={emptyStyle} />);
      }
    }
  }

  // One transparent overlay per work column. Captures hover and click for the
  // whole vertical strip so the 9 cells underneath act as a single target.
  const columnLinks = worksByCol.map((work, col) =>
    work ? (
      <Link
        key={`col-${col}`}
        href={`/works/${work.slug}`}
        aria-label={localizedTitle(work, lang)}
        className="work-column-link"
        style={{
          gridColumnStart: col + 1,
          gridRowStart: 1,
          gridRowEnd: gridSize + 1,
        }}
        onMouseEnter={() => setHoverCol(col)}
        onMouseLeave={() => setHoverCol(null)}
        onFocus={() => setHoverCol(col)}
        onBlur={() => setHoverCol(null)}
      />
    ) : null
  );

  return (
    <div className="relative w-full">
      <div className="work-grid">
        {cells}
        {columnLinks}
      </div>
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
