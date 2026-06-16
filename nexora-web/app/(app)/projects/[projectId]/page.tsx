'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import type { ProjectOverview } from '@/lib/types/shared';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ProjectDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const projectId = params.projectId as string;
  const [auditError, setAuditError] = useState('');

  const { data: overview, isLoading } = useQuery({
    queryKey: ['project-overview', projectId],
    queryFn: () => apiFetch<ProjectOverview>(`/projects/${projectId}/overview`),
    refetchInterval: (q: any) => {
      const o = q.state.data as ProjectOverview | undefined;
      return o?.lastAudit?.status === 'running' || o?.lastAudit?.status === 'pending' ? 10000 : false;
    },
  });

  const launchMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/projects/${projectId}/audits`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] });
      queryClient.invalidateQueries({ queryKey: ['audits', projectId] });
      setAuditError('');
    },
    onError: (e: ApiError) => setAuditError(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;
  if (!overview) return <p className="text-sm text-muted-foreground">Projet introuvable</p>;

  const { project, lastAudit, rankings, competitors } = overview;
  const isRunning = lastAudit?.status === 'running' || lastAudit?.status === 'pending';

  return (
    <div className="space-y-6">
      {auditError && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{auditError}</div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Score SEO</CardTitle>
          <Button
            onClick={() => launchMutation.mutate()}
            disabled={launchMutation.isPending || isRunning}
          >
            {launchMutation.isPending ? 'Lancement...' : isRunning ? 'En cours...' : 'Lancer un audit'}
          </Button>
        </CardHeader>
        <CardContent>
          {!lastAudit && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Pas encore d&apos;audit. Lancez votre premier audit pour commencer.
            </p>
          )}

          {isRunning && (
            <p className="text-sm text-brand text-center py-8">Audit en cours...</p>
          )}

          {lastAudit && !isRunning && (
            <>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-5xl font-bold">
                    <Badge variant={lastAudit.scoreGlobal >= 80 ? 'success' : lastAudit.scoreGlobal >= 50 ? 'warning' : 'destructive'} className="text-3xl px-4 py-2">
                      {lastAudit.scoreGlobal}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">/ 100</div>
                </div>
                <div className="flex-1 grid grid-cols-5 gap-2 text-center text-xs">
                  {[
                    { key: 'technical', label: 'Technique', max: 30 },
                    { key: 'onpage', label: 'On-page', max: 25 },
                    { key: 'performance', label: 'Performance', max: 20 },
                    { key: 'crawlability', label: 'Crawlabilité', max: 15 },
                    { key: 'content', label: 'Contenu', max: 10 },
                  ].map(c => (
                    <div key={c.key}>
                      <div className="text-lg font-bold">{(lastAudit.categories as any)[c.key] ?? 0}</div>
                      <div className="text-muted-foreground">/ {c.max}</div>
                      <div className="font-medium mt-0.5">{c.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span>Dernier audit : {new Date(lastAudit.createdAt).toLocaleDateString('fr')}</span>
                <span>· {lastAudit.pagesCrawled} pages</span>
                <span>· {lastAudit.issuesCount} problèmes</span>
                <Link
                  href={`/projects/${projectId}/audits/${lastAudit.id}`}
                  className="text-brand font-medium hover:underline"
                >
                  Voir le rapport complet →
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Positions</CardTitle>
          <Link
            href={`/projects/${projectId}/rankings`}
            className="text-sm text-brand font-medium hover:underline"
          >
            + Ajouter un mot-clé
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{rankings.totalKeywords}</div>
              <div className="text-xs text-muted-foreground">mots-clés</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{rankings.avgPosition ?? '–'}</div>
              <div className="text-xs text-muted-foreground">position moy.</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-success">+{rankings.gained30d}</div>
              <div className="text-xs text-muted-foreground">gagnés (30j)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-destructive">-{rankings.lost30d}</div>
              <div className="text-xs text-muted-foreground">perdus (30j)</div>
            </div>
          </div>
          <div className="mt-3">
            <Link
              href={`/projects/${projectId}/rankings`}
              className="text-xs text-brand font-medium hover:underline"
            >
              Voir toutes les positions →
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Concurrents</CardTitle>
          <Link
            href={`/projects/${projectId}/competitors`}
            className="text-sm text-brand font-medium hover:underline"
          >
            + Ajouter
          </Link>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            <p>
              <span className="font-medium">{project.domain}:</span> {competitors.projectKeywordsTop10} mots-clés dans le top 10
            </p>
          </div>
          {competitors.competitorComparison.length === 0 ? (
            <p className="text-xs text-muted-foreground mt-3">Aucun concurrent ajouté.</p>
          ) : (
            <div className="mt-3 space-y-1">
              {competitors.competitorComparison.map(c => (
                <div key={c.id} className="flex justify-between text-sm">
                  <span>{c.domain}</span>
                  <span className="text-muted-foreground">{c.top10} dans le top 10</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3">
            <Link
              href={`/projects/${projectId}/competitors`}
              className="text-xs text-brand font-medium hover:underline"
            >
              Voir les concurrents →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
