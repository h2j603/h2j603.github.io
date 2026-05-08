import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Work, WorkImage } from '@/lib/types';
import { WorkForm } from '@/components/admin/WorkForm';

export const dynamic = 'force-dynamic';

export default async function EditWorkPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: work } = await supabase
    .from('works')
    .select('*')
    .eq('id', params.id)
    .single();
  if (!work) notFound();
  const { data: images } = await supabase
    .from('work_images')
    .select('*')
    .eq('work_id', params.id)
    .order('order_index', { ascending: true });

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg">Edit work</h2>
      <WorkForm
        mode="edit"
        initial={work as Work}
        initialImages={(images ?? []) as WorkImage[]}
      />
    </section>
  );
}
