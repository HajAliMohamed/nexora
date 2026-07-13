'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import type { Agency, Project } from '@/lib/types/shared';
import {
  Workflow, Crosshair, LineChart as LineChartIcon, FileText,
  LayoutTemplate, Link as LinkIcon, Kanban, ShoppingCart, Sparkles,
  AlertTriangle, TrendingUp, TrendingDown, Minus, ChevronRight,
  Clock, Globe,
} from 'lucide-react';

const MODULES = [
  { key: 'strategy', label: 'Stratégie IA', href: '/agency/strategy', icon: Workflow, color: '#4F46E5' },
  { key: 'radar', label: 'Radar Concurrents', href: '/agency/radar', icon: Crosshair, color: '#06B6D4' },
  { key: 'predictive', label: 'Prédictions IA', href: '/agency/predictive', icon: LineChartIcon, color: '#F97316' },
  { key: 'automation', label: 'Automatisation', href: '/agency/automation', icon: Sparkles, color: '#22C55E' },
  { key: 'content', label: 'Contenu IA', href: '/agency/content-factory', icon: FileText, color: '#8B5CF6' },
  { key: 'landing', label: 'Landing Pages', href: '/agency/landing-generator', icon: LayoutTemplate, color: '#EC4899' },
  { key: 'backlinks', label: 'Backlinks', href: '/agency/backlinks', icon: LinkIcon, color: '#14B8A6' },
  { key: 'crm', label: 'CRM', href: '/agency/crm', icon: Kanban, color: '#6366F1' },
  { key: 'marketplace', label: 'Marketplace', href: '/agency/marketplace', icon: ShoppingCart, color: '#F59E0B' },
];

function TrendBadge({ trend }: { trend?: string }) {
  if (!trend) return null;
  if (trend === 'up') return <TrendingUp size={14} className="text-green-400" />;
  if (trend === 'down') return <TrendingDown size={14} className="text-red-400" />;
  return <Minus size={14} className="text-muted-foreground" />;
}

export default function V3DashboardPage() {
  const router = useRouter();

  const { data: agencies } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => apiFetch<Agency[]>('/agencies'),
  });
  const agency = agencies?.[0];

  const { data: projects } = useQuery({
    queryKey: ['agency-projects', agency?.id],
    queryFn: () => apiFetch<Project[]>(`/agencies/${agency!.id}/projects`),
    enabled: !!agency,
  });
  const project = projects?.[0];

  const { data: strategy } = useQuery({
    queryKey: ['strategy', project?.id],
    queryFn: () => apiFetch<{ id: string; roadmap: { phases: any[]; summary: string }; createdAt: string }>(`/projects/${project!.id}/strategy`),
    enabled: !!project,
  });

  const { data: radar } = useQuery({
    queryKey: ['radar', project?.id],
    queryFn: () => apiFetch<{ events: any[]; competitorMovements: any[] }>(`/projects/${project!.id}/competitors/radar`),
    enabled: !!project,
  });

  const { data: predictive } = useQuery({
    queryKey: ['predictive-latest', project?.id],
    queryFn: () => apiFetch<{ id: string; forecast: any[]; trend: any; risk: any; createdAt: string }>(`/projects/${project!.id}/predictive?metricType=traffic`),
    enabled: !!project,
  });

  const { data: automations } = useQuery({
    queryKey: ['automations', project?.id],
    queryFn: () => apiFetch<{ id: string; name: string; active: boolean; triggerType: string }[]>(`/projects/${project!.id}/automation/rules`),
    enabled: !!project,
  });

  const { data: briefs } = useQuery({
    queryKey: ['briefs', project?.id],
    queryFn: () => apiFetch<any[]>(`/projects/${project!.id}/content/briefs`),
    enabled: !!project,
  });

  const { data: articles } = useQuery({
    queryKey: ['articles', project?.id],
    queryFn: () => apiFetch<any[]>(`/projects/${project!.id}/content/articles`),
    enabled: !!project,
  });

  const { data: landings } = useQuery({
    queryKey: ['landings', project?.id],
    queryFn: () => apiFetch<any[]>(`/projects/${project!.id}/landing`),
    enabled: !!project,
  });

  const { data: opportunities } = useQuery({
    queryKey: ['backlink-opportunities', project?.id],
    queryFn: () => apiFetch<any[]>(`/projects/${project!.id}/backlinks/opportunities`),
    enabled: !!project,
  });

  const { data: outreach } = useQuery({
    queryKey: ['backlink-outreach', project?.id],
    queryFn: () => apiFetch<any[]>(`/projects/${project!.id}/backlinks/outreach`),
    enabled: !!project,
  });

  const { data: tasks } = useQuery({
    queryKey: ['crm-tasks', project?.id],
    queryFn: () => apiFetch<any[]>(`/projects/${project!.id}/crm/tasks`),
    enabled: !!project,
  });

  const { data: purchases } = useQuery({
    queryKey: ['marketplace-purchases'],
    queryFn: () => apiFetch<any[]>('/marketplace/purchases'),
  });

  const { data: alerts } = useQuery({
    queryKey: ['alerts', project?.id],
    queryFn: () => apiFetch<{ id: string; type: string; createdAt: string; readAt: string | null; payload: any }[]>(`/projects/${project!.id}/alerts`),
    enabled: !!project,
  });

  const activeRules = automations?.filter(r => r.active).length ?? 0;
  const totalRules = automations?.length ?? 0;
  const openTasks = tasks?.filter(t => t.status !== 'done').length ?? 0;
  const totalTasks = tasks?.length ?? 0;
  const totalOpportunities = opportunities?.length ?? 0;
  const sentOutreach = outreach?.filter(o => o.status === 'sent').length ?? 0;
  const radarEvents = radar?.events?.length ?? 0;
  const totalContent = (briefs?.length ?? 0) + (articles?.length ?? 0);
  const totalLandings = landings?.length ?? 0;
  const totalPurchases = purchases?.length ?? 0;
  const unreadAlerts = alerts?.filter(a => !a.readAt).length ?? 0;

  const trend = predictive?.trend?.direction;
  const forecastData = predictive?.forecast?.slice(0, 14) ?? [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">V3 Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vue d&apos;ensemble des modules IA &mdash; {project?.name ?? 'Sélectionnez un projet'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-4">
        <div className="bg-surface border border-border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/agency/strategy')}>
          <div className="flex items-center justify-between mb-3">
            <Workflow size={20} className="text-[#4F46E5]" />
            <ChevronRight size={16} className="text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{strategy ? '1' : '0'}</p>
          <p className="text-xs text-muted-foreground mt-1">Stratégies actives</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/agency/radar')}>
          <div className="flex items-center justify-between mb-3">
            <Crosshair size={20} className="text-[#06B6D4]" />
            <ChevronRight size={16} className="text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{radarEvents}</p>
          <p className="text-xs text-muted-foreground mt-1">Événements concurrents</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/agency/predictive')}>
          <div className="flex items-center justify-between mb-3">
            <LineChartIcon size={20} className="text-[#F97316]" />
            <TrendBadge trend={trend} />
          </div>
          <p className="text-2xl font-bold text-foreground">{forecastData.length > 0 ? `${forecastData.length}j` : '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">Prévisions ({predictive?.trend?.direction ?? 'aucune'})</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/agency/automation')}>
          <div className="flex items-center justify-between mb-3">
            <Sparkles size={20} className="text-[#22C55E]" />
            <ChevronRight size={16} className="text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{activeRules}/{totalRules}</p>
          <p className="text-xs text-muted-foreground mt-1">Règles actives</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/agency/content-factory')}>
          <div className="flex items-center justify-between mb-3">
            <FileText size={20} className="text-[#8B5CF6]" />
            <ChevronRight size={16} className="text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalContent}</p>
          <p className="text-xs text-muted-foreground mt-1">Contenus générés</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/agency/landing-generator')}>
          <div className="flex items-center justify-between mb-3">
            <LayoutTemplate size={20} className="text-[#EC4899]" />
            <ChevronRight size={16} className="text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalLandings}</p>
          <p className="text-xs text-muted-foreground mt-1">Landing pages</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/agency/backlinks')}>
          <div className="flex items-center justify-between mb-3">
            <LinkIcon size={20} className="text-[#14B8A6]" />
            <ChevronRight size={16} className="text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalOpportunities}</p>
          <p className="text-xs text-muted-foreground mt-1">Opportunités backlinks</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/agency/crm')}>
          <div className="flex items-center justify-between mb-3">
            <Kanban size={20} className="text-[#6366F1]" />
            <ChevronRight size={16} className="text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{openTasks}/{totalTasks}</p>
          <p className="text-xs text-muted-foreground mt-1">Tâches CRM ouvertes</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {forecastData.length > 0 && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <LineChartIcon size={16} className="text-[#F97316]" />
              Prévisions trafic (14 jours)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: '8px', fontSize: '12px',
                  }}
                />
                <Line type="monotone" dataKey="value" stroke="#F97316" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="confidenceLower" stroke="#F97316" strokeOpacity={0.2} strokeWidth={1} dot={false} />
                <Line type="monotone" dataKey="confidenceUpper" stroke="#F97316" strokeOpacity={0.2} strokeWidth={1} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {radarEvents > 0 && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Crosshair size={16} className="text-[#06B6D4]" />
              Derniers mouvements concurrents
            </h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {radar?.events?.slice(0, 8).map((e: any, i: number) => (
                <div key={i} className="flex items-center gap-3 text-xs text-muted-foreground bg-surface-alt/50 rounded-lg p-2.5">
                  <div className={`w-2 h-2 rounded-full ${e.type?.includes('gain') || e.type?.includes('new') ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="flex-1 truncate">{e.competitor}: {e.detail || e.keyword}</span>
                  <span className="text-[10px] uppercase text-muted-foreground/60">{e.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {totalRules > 0 && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-[#22C55E]" />
              Règles d&apos;automatisation
            </h3>
            <div className="space-y-1.5">
              {automations?.slice(0, 5).map((r: any) => (
                <div key={r.id} className="flex items-center gap-2 text-xs">
                  <div className={`w-1.5 h-1.5 rounded-full ${r.active ? 'bg-green-400' : 'bg-muted-foreground/30'}`} />
                  <span className="text-muted-foreground truncate flex-1">{r.name}</span>
                  <span className="text-[10px] uppercase text-muted-foreground/50">{r.triggerType}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {openTasks > 0 && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Kanban size={16} className="text-[#6366F1]" />
              Tâches CRM en cours
            </h3>
            <div className="space-y-1.5">
              {tasks?.filter(t => t.status !== 'done').slice(0, 5).map((t: any) => (
                <div key={t.id} className="flex items-center gap-2 text-xs">
                  <Clock size={12} className="text-muted-foreground" />
                  <span className="text-muted-foreground truncate flex-1">{t.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    t.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                    t.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>{t.priority}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {unreadAlerts > 0 && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              Alertes non lues
            </h3>
            <div className="space-y-1.5">
              {alerts?.filter(a => !a.readAt).slice(0, 5).map((a: any) => (
                <div key={a.id} className="flex items-center gap-2 text-xs">
                  <AlertTriangle size={12} className="text-red-400/70" />
                  <span className="text-muted-foreground truncate flex-1">{a.type?.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] text-muted-foreground/50">{new Date(a.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalOpportunities > 0 && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <LinkIcon size={16} className="text-[#14B8A6]" />
              Backlinks — Outreach
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-2xl font-bold text-foreground">{sentOutreach}/{outreach?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Emails envoyés</p>
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold text-foreground">{totalOpportunities}</p>
                <p className="text-xs text-muted-foreground">Opportunités</p>
              </div>
            </div>
          </div>
        )}

        {totalPurchases > 0 && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <ShoppingCart size={16} className="text-[#F59E0B]" />
              Marketplace
            </h3>
            <p className="text-2xl font-bold text-foreground">{totalPurchases}</p>
            <p className="text-xs text-muted-foreground">Extensions achetées</p>
          </div>
        )}

        {totalContent > 0 && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileText size={16} className="text-[#8B5CF6]" />
              Production de contenu
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-2xl font-bold text-foreground">{briefs?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Briefs</p>
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold text-foreground">{articles?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Articles</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {!project && (
        <div className="text-center py-12">
          <Globe size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-foreground">Aucun projet</h3>
          <p className="text-sm text-muted-foreground mt-1">Créez un projet pour voir les données V3.</p>
        </div>
      )}
    </div>
  );
}
