export type Category = 'T' | 'W' | 'E' | 'I' | 'ETC';

export const CATEGORIES: Category[] = ['T', 'W', 'E', 'I', 'ETC'];

export type Lang = 'kr' | 'en';

export interface Work {
  id: string;
  slug: string;
  title_kr: string;
  title_en: string;
  description_kr: string;
  description_en: string;
  categories: Category[];
  order_index: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkImage {
  id: string;
  work_id: string;
  storage_path: string;
  order_index: number;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

export interface WorkWithImages extends Work {
  images: WorkImage[];
}

export interface LayoutSettings {
  containerRatio: number;
  mobileRatio: number;
  outerMargin: number;
  container1Position: 'left' | 'right';
}

export interface GridSettings {
  size: number;
  cellTextSize: number;
  cellBorderWidth: number;
  cellGap: number;
  emptyCellStyle: 'lines' | 'none' | 'dotted';
}

export interface TypographySettings {
  baseFontSize: number;
  lineHeight: number;
}

export interface ColorSettings {
  background: string;
  text: string;
  border: string;
  categoryActive: string;
  categoryActiveText: string;
  hover: string;
}

export interface PanelSettings {
  activeStyle: 'fill' | 'outline' | 'invert';
  cornerDecoration: 'none' | 'circled-numerals' | 'asterisk' | 'custom';
  cornerCustom: string;
}

export interface DetailSettings {
  imageGap: number;
  titleToImage: number;
  imageToDescription: number;
  descriptionLineHeight: number;
}

export interface SiteSettings {
  id: number;
  layout: LayoutSettings;
  grid: GridSettings;
  typography: TypographySettings;
  colors: ColorSettings;
  panel: PanelSettings;
  detail: DetailSettings;
  show_archive_link: boolean;
  updated_at: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  id: 1,
  layout: { containerRatio: 5, mobileRatio: 4, outerMargin: 24, container1Position: 'left' },
  grid: { size: 9, cellTextSize: 80, cellBorderWidth: 1, cellGap: 0, emptyCellStyle: 'lines' },
  typography: { baseFontSize: 16, lineHeight: 1.5 },
  colors: {
    background: '#ffffff',
    text: '#000000',
    border: '#000000',
    categoryActive: '#000000',
    categoryActiveText: '#ffffff',
    hover: 'rgba(0,0,0,0.1)',
  },
  panel: { activeStyle: 'fill', cornerDecoration: 'none', cornerCustom: '' },
  detail: { imageGap: 48, titleToImage: 64, imageToDescription: 64, descriptionLineHeight: 1.7 },
  show_archive_link: false,
  updated_at: new Date().toISOString(),
};
