'use client';

import type { Category } from '@/lib/types';
import { useSettings } from '@/components/shared/SiteShell';

interface Props {
  active: Set<Category>;
  onToggle: (c: Category) => void;
}

const LAYOUT: (Category | null)[] = [
  null, 'T', null,
  'W', 'ETC', 'E',
  null, 'I', null,
];

export function CategoryGrid({ active, onToggle }: Props) {
  const settings = useSettings();
  const style = settings.panel.activeStyle;

  return (
    <div className="category-grid">
      {LAYOUT.map((cell, idx) => {
        if (!cell) {
          return <div key={idx} className="category-cell category-cell-empty" />;
        }
        const isActive = active.has(cell);
        const activeClass = isActive
          ? style === 'fill'
            ? 'category-cell-active'
            : style === 'outline'
            ? 'category-cell-outline'
            : 'category-cell-active'
          : '';
        const label = cell === 'ETC' ? '+' : cell;
        return (
          <button
            key={idx}
            type="button"
            className={`category-cell ${activeClass}`.trim()}
            onClick={() => onToggle(cell)}
            aria-pressed={isActive}
            aria-label={`Category ${cell}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
