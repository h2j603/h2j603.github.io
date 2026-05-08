import type { SiteSettings } from './types';

export function settingsToCssVars(s: SiteSettings): Record<string, string> {
  return {
    '--container-ratio': `${s.layout.containerRatio}fr`,
    '--mobile-ratio': `${s.layout.mobileRatio}fr`,
    '--outer-margin': `${s.layout.outerMargin}px`,
    '--container-1-position': s.layout.container1Position,

    '--grid-size': String(s.grid.size),
    '--cell-text-size': String(s.grid.cellTextSize),
    '--cell-border-width': `${s.grid.cellBorderWidth}px`,
    '--cell-gap': `${s.grid.cellGap}px`,

    '--base-font-size': `${s.typography.baseFontSize}px`,
    '--line-height': String(s.typography.lineHeight),

    '--color-bg': s.colors.background,
    '--color-text': s.colors.text,
    '--color-border': s.colors.border,
    '--color-category-active-bg': s.colors.categoryActive,
    '--color-category-active-text': s.colors.categoryActiveText,
    '--color-hover': s.colors.hover,

    '--detail-image-gap': `${s.detail.imageGap}px`,
    '--detail-title-to-image': `${s.detail.titleToImage}px`,
    '--detail-image-to-desc': `${s.detail.imageToDescription}px`,
    '--detail-desc-line-height': String(s.detail.descriptionLineHeight),
  };
}

export function cssVarsToInlineString(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ');
}
