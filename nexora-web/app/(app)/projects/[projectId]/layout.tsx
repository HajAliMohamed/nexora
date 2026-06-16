'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';

const TABS = [
  { href: '', label: 'Vue d\'ensemble' },
  { href: '/audits', label: 'Audits' },
  { href: '/rankings', label: 'Positions' },
  { href: '/competitors', label: 'Concurrents' },
  { href: '/settings', label: 'Paramètres' },
];

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;

  return (
    <div className="space-y-6">
      <div className="border-b">
        <nav className="flex gap-6 -mb-px overflow-x-auto">
          {TABS.map(tab => {
            const href = `/projects/${projectId}${tab.href}`;
            const active = pathname === href || (tab.href !== '' && pathname.startsWith(href));
            return (
              <Link
                key={tab.href}
                href={href}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                  active
                    ? 'border-brand text-brand'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
