import type { Lang, Work } from './types';

export function localizedTitle(work: Pick<Work, 'title_kr' | 'title_en'>, lang: Lang): string {
  return lang === 'kr' ? work.title_kr : work.title_en;
}

export function localizedDescription(
  work: Pick<Work, 'description_kr' | 'description_en'>,
  lang: Lang
): string {
  return lang === 'kr' ? work.description_kr : work.description_en;
}
