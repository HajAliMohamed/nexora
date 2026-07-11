'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Agency } from '@/lib/types/shared';
import { Search, Bell, LayoutDashboard, Sparkles, FolderKanban, Search as SearchIcon, AlertTriangle, FileText, Users, Users2, CreditCard, Settings, Menu, X, Workflow, Crosshair, LineChart, Link as LinkIcon, LayoutTemplate, Kanban, ShoppingCart } from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: any;
  badgeKey?: string;
  requireAgency?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Vue d\'ensemble',
    items: [
      { href: '/agency/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
      { href: '/agency/assistant', label: 'Assistant IA', icon: Sparkles },
    ]
  },
  {
    title: 'V3',
    items: [
      { href: '/agency/strategy', label: 'AI Strategy', icon: Workflow },
      { href: '/agency/radar', label: 'Radar Concurrents', icon: Crosshair },
      { href: '/agency/predictive', label: 'Prédictions IA', icon: LineChart },
      { href: '/agency/automation', label: 'Automatisation', icon: Sparkles },
      { href: '/agency/content-factory', label: 'Contenu IA', icon: FileText },
      { href: '/agency/landing-generator', label: 'Landing Pages', icon: LayoutTemplate },
      { href: '/agency/backlinks', label: 'Backlinks', icon: LinkIcon },
      { href: '/agency/crm', label: 'CRM', icon: Kanban },
      { href: '/agency/marketplace', label: 'Marketplace', icon: ShoppingCart },
    ]
  },
  {
    title: 'Outils SEO',
    items: [
      { href: '/agency/projects', label: 'Projets', icon: FolderKanban },
      { href: '/agency/keyword-research', label: 'Mots-clés', icon: SearchIcon },
      { href: '/agency/alerts', label: 'Alertes', icon: AlertTriangle, badgeKey: 'alerts' },
      { href: '/agency/reports', label: 'Rapports', icon: FileText },
    ]
  },
  {
    title: 'Gestion',
    items: [
      { href: '/agency/clients', label: 'Clients', icon: Users, requireAgency: true },
      { href: '/agency/team', label: 'Équipe', icon: Users2, requireAgency: true },
      { href: '/agency/billing', label: 'Facturation', icon: CreditCard },
      { href: '/agency/settings', label: 'Paramètres', icon: Settings },
    ]
  }
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

  if (!agenciesLoading && (!agencies || agencies.length === 0)) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Bienvenue sur Nexora</h1>
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
              className="bg-surface"
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
    <div className="flex h-full flex-1 bg-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-30 w-64 border-r border-border flex flex-col bg-surface transition-transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 px-6 flex items-center justify-between border-b border-border/50">
          <Link href="/agency/dashboard" className="font-bold text-xl tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">N</div>
            <span>Nexora</span>
          </Link>
          <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {NAV_GROUPS.map((group, i) => (
            <div key={i} className="space-y-1">
              <h4 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group.title}
              </h4>
              {group.items.filter(item => !item.requireAgency || isAgencyPlan).map(item => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-surface-alt'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className={active ? 'text-primary' : 'text-muted-foreground'} />
                      <span>{item.label}</span>
                    </div>
                    {item.badgeKey === 'alerts' && (unread?.count ?? 0) > 0 && (
                      <span className={`text-xs rounded-full px-2 py-0.5 font-semibold ${
                        active
                          ? 'bg-primary text-white'
                          : 'bg-destructive/10 text-destructive'
                      }`}>
                        {unread?.count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        
        <div className="p-4 border-t border-border/50 bg-surface">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-alt transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user.name?.[0] || user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.name || 'Agent SEO'}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => logoutMutation.mutate()}
            className="w-full text-left px-3 py-2 mt-2 text-xs text-muted-foreground hover:text-destructive transition-colors font-medium rounded-md hover:bg-destructive/10"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Topbar */}
        <header className="h-16 border-b border-border/50 bg-surface/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-1.5 rounded-md hover:bg-surface-alt text-muted-foreground" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center text-sm text-muted-foreground bg-surface-alt/50 rounded-full px-3 py-1.5 border border-border/50">
              <Search size={14} className="mr-2" />
              <span>Rechercher (Cmd+K)</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full hover:bg-surface-alt text-muted-foreground transition-colors relative">
              <Bell size={18} />
              {(unread?.count ?? 0) > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive border-2 border-background"></span>
              )}
            </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
