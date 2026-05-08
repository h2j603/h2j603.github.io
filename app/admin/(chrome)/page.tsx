import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Work } from '@/lib/types';
import { WorkOrderEditor } from '@/components/admin/WorkOrderEditor';

export const dynamic = 'force-dynamic';

export default async function AdminWorksPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('works')
    .select('*')
    .order('order_index', { ascending: true });
  const works = (data ?? []) as Work[];

  return (
    <section className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">Works</h2>
        <Link
          href="/admin/works/new"
          className="border border-current px-3 py-1 text-sm"
        >
          + New Work
        </Link>
      </div>
      <WorkOrderEditor initialWorks={works} />
    </section>
  );
}
