'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Agency, Project, ProjectOverview, AiSearchData, GrowthData, VisibilityPoint } from '@/lib/types/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScoreCard } from '@/components/dashboard/score-card';
import { ChartLine } from '@/components/dashboard/chart-line';
import { NarrativeBlock } from '@/components/narrative-block';
import { getPlanLabel } from '@/lib/plans';

export default function AgencyDashboardPage() {
  const router = useRouter();
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const { data: agencies, isLoading: agenciesLoading } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => apiFetch<Agency[]>('/agencies'),
  });
  const agency = agencies?.[0];

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['agency-projects', agency?.id],
    queryFn: () => apiFetch<Project[]>(`/agencies/${agency!.id}/projects`),
    enabled: !!agency,
  });
  const firstProject = projects?.[0];

  const { data: overview } = useQuery({
    queryKey: ['project-overview', firstProject?.id],
    queryFn: () => apiFetch<ProjectOverview>(`/projects/${firstProject!.id}/overview`),
    enabled: !!firstProject,
  });

  const { data: aiData } = useQuery({
    queryKey: ['ai-search', firstProject?.id],
    queryFn: () => apiFetch<AiSearchData>(`/projects/${firstProject!.id}/ai-search`),
    enabled: !!firstProject,
  });

  const { data: growthData } = useQuery({
    queryKey: ['growth', firstProject?.id],
    queryFn: () => apiFetch<GrowthData>(`/projects/${firstProject!.id}/growth`),
    enabled: !!firstProject,
  });

  const { data: visibilityData } = useQuery({
    queryKey: ['visibility', firstProject?.id],
    queryFn: () => apiFetch<VisibilityPoint[]>(`/projects/${firstProject!.id}/keywords/visibility`),
    enabled: !!firstProject,
  });

  const { data: usage } = useQuery({
    queryKey: ['usage'],
    queryFn: () => apiFetch<{ plan: string }>('/me/usage'),
  });

  const inviteClientMutation = useMutation({
    mutationFn: (email: string) =>
      apiFetch(`/agencies/${agency!.id}/clients/invite`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    onSuccess: () => {
      setInviteModal(false);
      setInviteEmail('');
    },
  });

  const isLoading = agenciesLoading || projectsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 grid-cols-4 md:grid-cols-8 lg:grid-cols-12">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 col-span-4" />)}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (!agency) return null;

  const seoHealth = overview?.lastAudit?.scoreGlobal ?? null;
  const issuesCount = overview?.lastAudit?.issuesCount ?? 0;
  const pagesCrawled = overview?.lastAudit?.pagesCrawled ?? 0;
  const aiVisibility = aiData?.visibilityScore ?? null;
  const growthPotential = growthData?.potentialScore ?? null;
  const opportunities = aiData?.opportunities?.map(o => o.prompt) ?? [];
  const chartData = visibilityData?.map(d => ({ date: d.date, value: d.score })) ?? [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{agency.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Tableau de bord de l&apos;agence ({getPlanLabel(usage?.plan ?? '')})</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setInviteModal(true)} className="btn-transition hover:bg-surface-alt">
            Inviter un client
          </Button>
          <Button onClick={() => router.push('/agency/reports')} className="btn-transition">
            Générer un rapport
          </Button>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-4 md:grid-cols-8 lg:grid-cols-12">
        <ScoreCard
          title="SEO Health"
          value={seoHealth}
          color="var(--primary)"
        />
        <ScoreCard
          title="AI Visibility"
          value={aiVisibility}
          color="var(--info)"
        />
        <ScoreCard
          title="Growth Potential"
          value={growthPotential}
          color="var(--success)"
        />

        {chartData.length > 0 && (
          <ChartLine title="Évolution du SEO Health" data={chartData} />
        )}

        <div className="col-span-12 md:col-span-8 lg:col-span-12">
          <NarrativeBlock
            scoreGlobal={seoHealth}
            issuesCount={issuesCount}
            pagesCrawled={pagesCrawled}
            aiVisibility={aiVisibility ?? undefined}
            growthPotential={growthPotential ?? undefined}
            topOpportunities={opportunities}
          />
        </div>
      </div>

      <Dialog open={inviteModal} onClose={() => setInviteModal(false)}>
        <DialogHeader>
          <DialogTitle>Inviter un client</DialogTitle>
          <DialogDescription>
            Le client recevra un lien de connexion magique par email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">Email du client</label>
            <Input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="client@exemple.com"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setInviteModal(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => inviteClientMutation.mutate(inviteEmail)}
              disabled={!inviteEmail || inviteClientMutation.isPending}
            >
              {inviteClientMutation.isPending ? 'Envoi...' : "Envoyer l'invitation"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
