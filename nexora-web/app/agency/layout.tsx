'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Agency } from '@/lib/types/shared';

const BASE_NAV_ITEMS: { href: string; label: string; badgeKey?: string }[] = [
  { href: '/agency/dashboard', label: 'Tableau de bord' },
  { href: '/agency/projects', label: 'Projets' },
  { href: '/agency/keyword-research', label: 'Mots-clés' },
  { href: '/agency/alerts', label: 'Alertes' },
  { href: '/agency/reports', label: 'Rapports' },
  { href: '/agency/assistant', label: 'Assistant' },
  { href: '/agency/billing', label: 'Facturation' },
  { href: '/agency/settings', label: 'Paramètres' },
];

const AGENCY_NAV_ITEMS: { href: string; label: string }[] = [
  { href: '/agency/clients', label: 'Clients' },
  { href: '/agency/team', label: 'Équipe' },
];

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState('');
  const [createError, setCreateError] = useState('');

  const { data: user, isLoading, isFetching, error } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<{ id: string; email: string; name?: string; role: string; onboardingComplete: boolean }>('/me'),
    retry: false,
  });

  const { data: agencies, isLoading: agenciesLoading } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => apiFetch<Agency[]>('/agencies'),
    enabled: !!user,
  });

  const { data: usage } = useQuery({
    queryKey: ['usage'],
    queryFn: () => apiFetch<{ plan: string }>('/me/usage'),
    enabled: !!user,
  });

  const { data: unread } = useQuery({
    queryKey: ['alerts-unread'],
    queryFn: () => apiFetch<{ count: number }>('/alerts/unread-count'),
    enabled: !!user,
    refetchInterval: (q: any) => {
      const d = q.state.data as { count: number } | undefined;
      return (d?.count ?? 0) > 0 ? 300000 : false;
    },
  });

  const createAgencyMutation = useMutation({
    mutationFn: (name: string) =>
      apiFetch<Agency>('/agencies', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      setNewAgencyName('');
      setCreateError('');
    },
    onError: (e: ApiError) => {
      setCreateError(e.message);
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
    if (isLoading || isFetching || agenciesLoading) return;
    if (error) { router.push('/login'); return; }
    if (!user) return;

    if (user.role === 'client') {
      router.push('/client/dashboard');
      return;
    }

    if (!user.onboardingComplete) {
      if (agencies && agencies.length > 0) {
        apiFetch('/me/onboarding-complete', { method: 'PATCH' }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['me'] });
        }).catch(() => {});
        return;
      }
      router.push('/onboarding');
      return;
    }
  }, [isLoading, isFetching, agenciesLoading, error, user, agencies, router, queryClient]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!user) return null;

  if (!agenciesLoading && (!agencies || agencies.length === 0) && !user?.onboardingComplete) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-2xl font-bold tracking-tight">Bienvenue sur Nexora</h1>
          <p className="text-sm text-muted-foreground">
            Créez votre agence pour commencer.
          </p>
          {createError && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{createError}</div>
          )}
          <div className="flex gap-2">
            <Input
              value={newAgencyName}
              onChange={e => setNewAgencyName(e.target.value)}
              placeholder="Nom de votre agence"
              onKeyDown={e => e.key === 'Enter' && newAgencyName.trim() && createAgencyMutation.mutate(newAgencyName.trim())}
            />
            <Button
              onClick={() => newAgencyName.trim() && createAgencyMutation.mutate(newAgencyName.trim())}
              disabled={!newAgencyName.trim() || createAgencyMutation.isPending}
            >
              {createAgencyMutation.isPending ? '...' : 'Créer'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isActive = (href: string) => pathname.startsWith(href);
  const isAgencyPlan = usage?.plan === 'agency';

  return (
    <div className="flex h-full flex-1">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed md:static inset-y-0 left-0 z-30 w-60 border-r flex flex-col bg-gray-50/80 backdrop-blur-sm transition-transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b flex items-center justify-between">
          <Link href="/agency/dashboard" className="font-bold text-lg tracking-tight">
            <span className="text-brand">Nex</span>ora
          </Link>
          <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(false)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {BASE_NAV_ITEMS.map(item => (
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
          {isAgencyPlan && AGENCY_NAV_ITEMS.map(item => (
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
          <p className="text-sm font-medium truncate px-1">{user.name || user.email}</p>
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
