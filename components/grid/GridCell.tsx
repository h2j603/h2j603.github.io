import type { ReactNode } from 'react';

interface GridCellProps {
  children?: ReactNode;
  emptyStyle?: 'lines' | 'none' | 'dotted';
  active?: boolean;
}

export function GridCell({ children, emptyStyle = 'lines', active }: GridCellProps) {
  const isEmpty = !children;
  const styleClass = isEmpty
    ? emptyStyle === 'none'
      ? 'grid-cell-empty-none'
      : emptyStyle === 'dotted'
      ? 'grid-cell-empty-dotted'
      : ''
    : '';
  const activeClass = active ? 'grid-cell-active' : '';

  return (
    <div
      aria-hidden="true"
      className={`grid-cell ${styleClass} ${activeClass}`.trim()}
    >
      {children ? <span className="grid-cell-text">{children}</span> : null}
    </div>
  );
}
