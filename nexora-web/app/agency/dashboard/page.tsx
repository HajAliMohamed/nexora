'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Agency, Project, ReportV2, AiSearchData, GrowthData } from '@/lib/types/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScoreCard } from '@/components/dashboard/score-card';
import { ChartLine } from '@/components/dashboard/chart-line';
import { NarrativeBlock } from '@/components/narrative-block';

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
    queryKey: ['projects'],
    queryFn: () => apiFetch<Project[]>('/projects'),
    enabled: !!agency,
  });

  const firstProjectId = projects?.[0]?.id;

  const { data: aiData } = useQuery({
    queryKey: ['ai-search', firstProjectId],
    queryFn: () => apiFetch<AiSearchData>(`/projects/${firstProjectId}/ai-search`),
    enabled: !!firstProjectId,
  });

  const { data: growthData } = useQuery({
    queryKey: ['growth', firstProjectId],
    queryFn: () => apiFetch<GrowthData>(`/projects/${firstProjectId}/growth`),
    enabled: !!firstProjectId,
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

  // Mock data for the chart since the real API might not have it yet
  const chartData = [
    { date: 'Jan', value: 65 },
    { date: 'Fev', value: 68 },
    { date: 'Mar', value: 74 },
    { date: 'Avr', value: 72 },
    { date: 'Mai', value: 80 },
    { date: 'Juin', value: 85 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{agency.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Tableau de bord de l'agence (Pro)</p>
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

      {/* Grid Layout (12 columns) */}
      <div className="grid gap-6 grid-cols-4 md:grid-cols-8 lg:grid-cols-12">
        {/* ScoreCards */}
        <ScoreCard 
          title="SEO Health" 
          value={85} 
          trend={12} 
          color="var(--primary)" 
        />
        <ScoreCard 
          title="AI Visibility" 
          value={aiData?.visibilityScore ?? 60} 
          trend={5} 
          color="var(--info)" 
        />
        <ScoreCard 
          title="Growth Potential" 
          value={growthData?.potentialScore ?? 75} 
          trend={-2} 
          color="var(--success)" 
        />

        {/* Evolution Chart */}
        <ChartLine title="Évolution du SEO Health" data={chartData} />

        {/* Narrative & Actions Blocks (spanning 12 cols total) */}
        <div className="col-span-12 md:col-span-8 lg:col-span-12">
          <NarrativeBlock 
            scoreGlobal={85}
            issuesCount={12}
            pagesCrawled={150}
            aiVisibility={aiData?.visibilityScore ?? 60}
            growthPotential={growthData?.potentialScore ?? 75}
            topOpportunities={['Optimiser les balises H1 sur les pages produits', 'Créer plus de contenu pour les requêtes IA']}
          />
        </div>
      </div>

      {/* Invite Client Modal */}
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
              {inviteClientMutation.isPending ? 'Envoi...' : 'Envoyer l\'invitation'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
