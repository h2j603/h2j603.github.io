import type { ReactNode } from 'react';
import Link from 'next/link';
import { LogoutButton } from '@/components/admin/LogoutButton';

export default function AdminChromeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-current px-6 py-3 flex items-center gap-6 text-sm">
        <Link href="/admin" className="font-medium">
          hyuk.xyz admin
        </Link>
        <span className="opacity-30">|</span>
        <Link href="/admin">Works</Link>
        <Link href="/admin/design">Design</Link>
        <span className="ml-auto" />
        <LogoutButton />
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
