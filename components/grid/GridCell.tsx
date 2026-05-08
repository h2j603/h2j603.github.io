'use client';

import type { ReactNode } from 'react';

interface GridCellProps {
  children?: ReactNode;
  emptyStyle?: 'lines' | 'none' | 'dotted';
  active?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
  className?: string;
  role?: string;
  ariaLabel?: string;
}

export function GridCell({
  children,
  emptyStyle = 'lines',
  active,
  onMouseEnter,
  onMouseLeave,
  onClick,
  className = '',
  role,
  ariaLabel,
}: GridCellProps) {
  const isEmpty = !children;
  const styleClass = isEmpty
    ? emptyStyle === 'none'
      ? 'grid-cell-empty-none'
      : emptyStyle === 'dotted'
      ? 'grid-cell-empty-dotted'
      : ''
    : '';
  const activeClass = active ? 'work-column-active' : '';

  return (
    <div
      className={`grid-cell ${styleClass} ${activeClass} ${className}`.trim()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      role={role}
      aria-label={ariaLabel}
    >
      {children ? <span className="grid-cell-text">{children}</span> : null}
    </div>
  );
}
