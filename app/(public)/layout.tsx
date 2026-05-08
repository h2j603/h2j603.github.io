import type { ReactNode } from 'react';
import { loadSiteSettings } from '@/lib/settings';
import { settingsToCssVars, cssVarsToInlineString } from '@/lib/design-tokens';
import { SiteShell } from '@/components/shared/SiteShell';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const settings = await loadSiteSettings();
  const inline = cssVarsToInlineString(settingsToCssVars(settings));

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `:root, [data-site-root] { ${inline} }`,
        }}
      />
      <SiteShell settings={settings}>{children}</SiteShell>
    </>
  );
}
