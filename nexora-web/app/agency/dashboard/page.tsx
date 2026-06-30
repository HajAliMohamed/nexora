'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Agency, Project, ReportV2, AiSearchData, GrowthData } from '@/lib/types/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

function ScoreCard({ label, score, color }: { label: string; score: number | null; color: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color }}>
              {score !== null ? score : '–'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: color }}>
            {score !== null ? Math.round(score / 10) : '?'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['reports', agency?.id],
    queryFn: () => apiFetch<ReportV2[]>(`/agencies/${agency!.id}/reports`),
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!agency) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{agency.name}</h1>
          <p className="text-sm text-muted-foreground">Tableau de bord de l&apos;agence</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setInviteModal(true)}>
            Inviter un client
          </Button>
          <Button onClick={() => router.push('/agency/reports')}>
            Générer un rapport
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Clients</p>
            <p className="text-3xl font-bold mt-1">{projects?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Projets</p>
            <p className="text-3xl font-bold mt-1">{projects?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Rapports générés</p>
            <p className="text-3xl font-bold mt-1">{reports?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Domaine personnalisé</p>
            <p className="text-lg font-bold mt-2 truncate">{agency.customDomain || 'Non configuré'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ScoreCard
          label="Score Visibilité IA"
          score={aiData?.visibilityScore ?? null}
          color="#8b5cf6"
        />
        <ScoreCard
          label="Score Potentiel Croissance"
          score={growthData?.potentialScore ?? null}
          color="#06b6d4"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rapports récents</CardTitle>
          <CardDescription>Derniers rapports générés pour vos clients</CardDescription>
        </CardHeader>
        <CardContent>
          {reportsLoading && <Skeleton className="h-20" />}
          {!reportsLoading && (!reports || reports.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun rapport pour le moment
            </p>
          )}
          {reports && reports.length > 0 && (
            <div className="space-y-3">
              {reports.slice(0, 5).map(report => (
                <div key={report.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">Rapport {report.periodType}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(report.createdAt).toLocaleDateString('fr')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {report.seoScore !== null && (
                      <Badge variant={report.seoScore >= 80 ? 'success' : report.seoScore >= 50 ? 'warning' : 'destructive'}>
                        SEO: {report.seoScore}
                      </Badge>
                    )}
                    {report.aiScore !== null && (
                      <Badge variant={report.aiScore >= 80 ? 'success' : report.aiScore >= 50 ? 'warning' : 'destructive'}>
                        IA: {report.aiScore}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteModal} onClose={() => setInviteModal(false)}>
        <DialogHeader>
          <DialogTitle>Inviter un client</DialogTitle>
          <DialogDescription>
            Le client recevra un lien de connexion magique par email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email du client</label>
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
