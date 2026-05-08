import { loadSiteSettings } from '@/lib/settings';
import { DesignPanel } from '@/components/admin/DesignPanel';

export const dynamic = 'force-dynamic';

export default async function DesignPage() {
  const settings = await loadSiteSettings();
  return <DesignPanel initial={settings} />;
}
