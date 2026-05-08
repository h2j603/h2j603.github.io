'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { SiteSettings } from '@/lib/types';

const SettingsContext = createContext<SiteSettings | null>(null);

export function useSettings(): SiteSettings {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SiteShell');
  return ctx;
}

export function SiteShell({
  settings,
  children,
}: {
  settings: SiteSettings;
  children: ReactNode;
}) {
  return (
    <SettingsContext.Provider value={settings}>
      <div data-site-root>{children}</div>
    </SettingsContext.Provider>
  );
}
