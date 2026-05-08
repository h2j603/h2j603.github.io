import { createClient } from './supabase/server';
import type { Work, WorkImage, WorkWithImages } from './types';

export async function listPublishedWorks(): Promise<Work[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('works')
      .select('*')
      .eq('published', true)
      .order('order_index', { ascending: true });
    if (error || !data) return [];
    return data as Work[];
  } catch {
    return [];
  }
}

export async function getWorkBySlug(slug: string): Promise<WorkWithImages | null> {
  try {
    const supabase = createClient();
    const { data: work, error } = await supabase
      .from('works')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single();

    if (error || !work) return null;

    const { data: images } = await supabase
      .from('work_images')
      .select('*')
      .eq('work_id', work.id)
      .order('order_index', { ascending: true });

    return { ...(work as Work), images: (images ?? []) as WorkImage[] };
  } catch {
    return null;
  }
}

export { publicImageUrl } from './storage-url';
