import { listPublishedWorks } from '@/lib/works';
import { loadSiteSettings } from '@/lib/settings';
import { HomeClient } from '@/components/HomeClient';

export const revalidate = 60;

export default async function HomePage() {
  const [works, settings] = await Promise.all([
    listPublishedWorks(),
    loadSiteSettings(),
  ]);
  return <HomeClient works={works} showArchiveLink={settings.show_archive_link} />;
}
