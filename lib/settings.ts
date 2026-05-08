import { createClient } from './supabase/server';
import { DEFAULT_SETTINGS, type SiteSettings } from './types';

export async function loadSiteSettings(): Promise<SiteSettings> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) return DEFAULT_SETTINGS;

    return {
      ...DEFAULT_SETTINGS,
      ...data,
      layout: { ...DEFAULT_SETTINGS.layout, ...(data.layout ?? {}) },
      grid: { ...DEFAULT_SETTINGS.grid, ...(data.grid ?? {}) },
      typography: { ...DEFAULT_SETTINGS.typography, ...(data.typography ?? {}) },
      colors: { ...DEFAULT_SETTINGS.colors, ...(data.colors ?? {}) },
      panel: { ...DEFAULT_SETTINGS.panel, ...(data.panel ?? {}) },
      detail: { ...DEFAULT_SETTINGS.detail, ...(data.detail ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
