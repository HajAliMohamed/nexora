'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const NAV_ITEMS: { href: string; label: string; badgeKey?: string }[] = [
  { href: '/dashboard', label: 'Tableau de bord' },
  { href: '/keyword-research', label: 'Mots-clés' },
  { href: '/alerts', label: 'Alertes', badgeKey: 'alerts-unread' },
  { href: '/billing', label: 'Facturation' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: user, isLoading, isFetching, error } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<{ id: string; email: string; name?: string; onboardingComplete: boolean }>('/me'),
    retry: false,
  });

  const { data: unread } = useQuery({
    queryKey: ['alerts-unread'],
    queryFn: () => apiFetch<{ count: number }>('/alerts/unread-count'),
    refetchInterval: (q: any) => {
      const d = q.state.data as { count: number } | undefined;
      return (d?.count ?? 0) > 0 ? 300000 : false;
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiFetch('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.clear();
      router.push('/login');
    },
  });

  useEffect(() => {
    if (isLoading || isFetching) return;
    if (error) { router.push('/login'); return; }
    if (user && !user.onboardingComplete && !pathname.startsWith('/onboarding')) {
      router.push('/onboarding');
    }
  }, [isLoading, isFetching, error, user, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!user) return null;

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <div className="flex h-full flex-1">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-30 w-60 border-r flex flex-col bg-gray-50/80 backdrop-blur-sm transition-transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-lg tracking-tight">
            <span className="text-brand">Nex</span>ora
          </h2>
          <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(false)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-brand text-white'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <span>{item.label}</span>
              {item.badgeKey && (unread?.count ?? 0) > 0 && (
                <span className={`text-xs rounded-full px-2 py-0.5 font-semibold ${
                  isActive(item.href)
                    ? 'bg-white/20 text-white'
                    : 'bg-brand/10 text-brand'
                }`}>
                  {unread?.count}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t space-y-2">
          <Link
            href="/settings"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/settings')
                ? 'bg-brand text-white'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            Paramètres
          </Link>
          <p className="text-sm font-medium truncate px-1">{user.name || user.email}</p>
          <button
            onClick={() => logoutMutation.mutate()}
            className="text-xs text-destructive hover:underline px-1"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto w-full">
        {/* Mobile header */}
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
