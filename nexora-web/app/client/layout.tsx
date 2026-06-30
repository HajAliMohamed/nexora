'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const CLIENT_NAV: { href: string; label: string }[] = [
  { href: '/client/dashboard', label: 'Tableau de bord' },
  { href: '/client/projects', label: 'Projets' },
  { href: '/client/reports', label: 'Rapports' },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: user, isLoading, isFetching, error } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<{ id: string; email: string; name?: string }>('/me'),
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiFetch('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.clear();
      router.push('/client/login');
    },
  });

  const isSharedReport = pathname.startsWith('/client/reports/') && pathname !== '/client/reports';

  useEffect(() => {
    if (isLoading || isFetching) return;
    if (error && pathname !== '/client/login' && !isSharedReport) { router.push('/client/login'); return; }
  }, [isLoading, isFetching, error, router, pathname, isSharedReport]);

  if (isLoading && !isSharedReport) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!user && pathname !== '/client/login' && !isSharedReport) return null;

  if (!user && (pathname === '/client/login' || isSharedReport)) return <>{children}</>;

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <div className="flex h-full flex-1">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed md:static inset-y-0 left-0 z-30 w-56 border-r flex flex-col bg-gray-50/80 backdrop-blur-sm transition-transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg tracking-tight">
            <span className="text-brand">Nex</span>ora
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Espace client</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {CLIENT_NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-brand text-white'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t space-y-2">
          <p className="text-sm font-medium truncate px-1">{user?.name || user?.email || ''}</p>
          <button
            onClick={() => logoutMutation.mutate()}
            className="text-xs text-destructive hover:underline px-1"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto w-full">
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-10">
          <h2 className="font-bold text-lg">
            <span className="text-brand">Nex</span>ora
          </h2>
          <button className="p-1.5 rounded-md hover:bg-accent" onClick={() => setSidebarOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          </button>
        </div>
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
