import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getWorkBySlug, publicImageUrl } from '@/lib/works';
import { loadSiteSettings } from '@/lib/settings';
import { WorkDetailClient } from '@/components/work/WorkDetail';

export const revalidate = 60;

interface Params {
  params: { slug: string };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const work = await getWorkBySlug(params.slug);
  if (!work) return { title: 'Not found — hyuk.xyz' };

  const ogImage = work.images[0]
    ? publicImageUrl(work.images[0].storage_path)
    : '/og-default.png';
  const description =
    (work.description_kr || work.description_en).slice(0, 100) || undefined;

  return {
    title: `${work.title_kr} · ${work.title_en} — hyuk.xyz`,
    description,
    openGraph: {
      title: work.title_kr,
      description,
      images: [ogImage],
      url: `/works/${work.slug}`,
    },
  };
}

export default async function WorkDetailPage({ params }: Params) {
  const [work, settings] = await Promise.all([
    getWorkBySlug(params.slug),
    loadSiteSettings(),
  ]);
  if (!work) notFound();
  return <WorkDetailClient work={work} showArchiveLink={settings.show_archive_link} />;
}
