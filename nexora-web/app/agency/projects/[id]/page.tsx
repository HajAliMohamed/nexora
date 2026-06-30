'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import type { ProjectOverview, AiSearchData, GrowthData, ReportV2 } from '@/lib/types/shared';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, FileSearch, Sparkles } from 'lucide-react';
import { AiHeatmap } from '@/components/ai-heatmap';
import { NarrativeBlock } from '@/components/narrative-block';

export default function AgencyProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.id as string;
  const [auditError, setAuditError] = useState('');

  const { data: overview, isLoading } = useQuery({
    queryKey: ['project-overview', projectId],
    queryFn: () => apiFetch<ProjectOverview>(`/projects/${projectId}/overview`),
    refetchInterval: (q: any) => {
      const o = q.state.data as ProjectOverview | undefined;
      return o?.lastAudit?.status === 'running' || o?.lastAudit?.status === 'pending' ? 10000 : false;
    },
  });

  const { data: aiData } = useQuery({
    queryKey: ['ai-search', projectId],
    queryFn: () => apiFetch<AiSearchData>(`/projects/${projectId}/ai-search`),
  });

  const { data: growthData } = useQuery({
    queryKey: ['growth', projectId],
    queryFn: () => apiFetch<GrowthData>(`/projects/${projectId}/growth`),
  });

  const { data: reports } = useQuery({
    queryKey: ['project-reports', projectId],
    queryFn: () => apiFetch<ReportV2[]>(`/reports/project/${projectId}`),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/reports/project/${projectId}/generate`, {
        method: 'POST',
        body: JSON.stringify({ periodType: 'monthly' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-reports', projectId] });
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

  if (isLoading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
      <Card>
        <CardHeader><Skeleton className="h-6 w-24" /></CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 grid grid-cols-5 gap-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="text-center"><Skeleton className="h-10 w-12 mx-auto" /><Skeleton className="h-3 w-16 mx-auto mt-1" /></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
  if (!overview) return <p className="text-sm text-muted-foreground">Projet introuvable</p>;

  const { project, lastAudit, rankings, competitors } = overview;
  const isRunning = lastAudit?.status === 'running' || lastAudit?.status === 'pending';

  return (
    <div className="space-y-6">
      {auditError && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{auditError}</div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-sm text-muted-foreground">{project.domain}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/agency/projects')}>
            Retour
          </Button>
          <Button
            onClick={() => launchMutation.mutate()}
            disabled={launchMutation.isPending || isRunning}
          >
            {launchMutation.isPending ? 'Lancement...' : isRunning ? 'En cours...' : 'Lancer un audit'}
          </Button>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? 'Génération...' : 'Générer un rapport'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Score SEO</CardTitle>
        </CardHeader>
        <CardContent>
          {!lastAudit && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Pas encore d&apos;audit. Lancez votre premier audit pour commencer.
            </p>
          )}

          {isRunning && (
            <div className="flex flex-col items-center justify-center py-10 space-y-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-brand/10 animate-ping" />
                <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-brand/5 border-2 border-brand/20">
                  <FileSearch className="h-8 w-8 text-brand animate-bounce" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-foreground">Audit en cours</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Nous analysons les pages de votre site pour évaluer les performances SEO.
                  Cette opération peut prendre quelques minutes.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Analyse en cours...</span>
              </div>
            </div>
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
                  href={`/agency/projects/${projectId}/audits/${lastAudit.id}`}
                  className="text-brand font-medium hover:underline"
                >
                  Voir le rapport complet →
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {lastAudit && !isRunning && (
        <NarrativeBlock
          scoreGlobal={lastAudit.scoreGlobal}
          issuesCount={lastAudit.issuesCount}
          pagesCrawled={lastAudit.pagesCrawled}
          aiVisibility={aiData?.visibilityScore}
          growthPotential={growthData?.potentialScore}
          topOpportunities={aiData?.opportunities?.slice(0, 2).map(o => o.prompt)}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Positions</CardTitle>
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
                href={`/agency/projects/${projectId}/rankings`}
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
              href={`/agency/projects/${projectId}/competitors`}
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
                {competitors.competitorComparison.map((c: any) => (
                  <div key={c.id} className="flex justify-between text-sm">
                    <span>{c.domain}</span>
                    <span className="text-muted-foreground">{c.top10} dans le top 10</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3">
              <Link
                href={`/agency/projects/${projectId}/competitors`}
                className="text-xs text-brand font-medium hover:underline"
              >
                Voir les concurrents →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Visibilité IA
            </CardTitle>
            <Link
              href={`/agency/projects/${projectId}/rankings`}
              className="text-xs text-brand font-medium hover:underline"
            >
              Voir tout →
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-500">
                  {aiData?.visibilityScore ?? '–'}
                </div>
                <p className="text-xs text-muted-foreground">/ 100</p>
              </div>
              <div className="flex-1 text-xs text-muted-foreground">
                <p>Score de visibilité dans les résultats de recherche IA.</p>
                <p className="mt-1">
                  {aiData?.snapshots?.filter(s => s.present).length ?? 0} / {aiData?.snapshots?.length ?? 0} prompts détectés
                </p>
              </div>
            </div>
            {aiData?.snapshots && aiData.snapshots.length > 0 && (
              <AiHeatmap data={aiData.snapshots.map(s => ({
                prompt: s.prompt,
                present: s.present,
                source: s.source,
              }))} />
            )}
            {aiData?.opportunities && aiData.opportunities.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Opportunités IA</p>
                {aiData.opportunities.slice(0, 4).map((opp: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2 text-xs">
                    <span className="truncate">{opp.prompt}</span>
                    <Badge variant="outline" className="shrink-0 ml-2">{opp.source}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Croissance</CardTitle>
            <Link
              href={`/agency/projects/${projectId}/rankings`}
              className="text-xs text-brand font-medium hover:underline"
            >
              Voir tout →
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-cyan-500">
                  {growthData?.potentialScore ?? '–'}
                </div>
                <p className="text-xs text-muted-foreground">/ 100</p>
              </div>
              <div className="flex-1 text-xs text-muted-foreground">
                <p>Potentiel de croissance basé sur les opportunités détectées.</p>
              </div>
            </div>
            {growthData?.pages && growthData.pages.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Pages en croissance</p>
                <div className="space-y-1">
                  {growthData.pages.slice(0, 3).map((page: any, i: number) => (
                    <div key={i} className="flex justify-between rounded-md bg-muted/50 px-3 py-1.5 text-xs">
                      <span className="truncate">{page.url}</span>
                      <span className={page.delta > 0 ? 'text-success shrink-0 ml-2' : 'text-destructive shrink-0 ml-2'}>
                        {page.delta > 0 ? '+' : ''}{page.delta}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {growthData?.keywords && growthData.keywords.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Mots-clés near-top 3</p>
                <div className="space-y-1">
                  {growthData.keywords.slice(0, 3).map((kw: any, i: number) => (
                    <div key={i} className="flex justify-between rounded-md bg-muted/50 px-3 py-1.5 text-xs">
                      <span className="truncate">{kw.keyword || kw.word}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">pos. {kw.position}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {growthData?.backlinks && growthData.backlinks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Backlinks impactants</p>
                <div className="space-y-1">
                  {growthData.backlinks.slice(0, 3).map((bl: any, i: number) => (
                    <div key={i} className="flex justify-between rounded-md bg-muted/50 px-3 py-1.5 text-xs">
                      <span className="truncate">{bl.url || bl.source}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">DR {bl.dr || bl.authority}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(!growthData?.pages || growthData.pages.length === 0) &&
             (!growthData?.keywords || growthData.keywords.length === 0) &&
             (!growthData?.backlinks || growthData.backlinks.length === 0) && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Aucune donnée de croissance disponible pour le moment.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rapports récents</CardTitle>
        </CardHeader>
        <CardContent>
          {!reports || reports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun rapport pour le moment
            </p>
          ) : (
            <div className="space-y-3">
              {reports.slice(0, 5).map((report: any) => (
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
                    {report.signedUrl && (
                      <Button variant="outline" size="sm" onClick={() => window.open(report.signedUrl!, '_blank')}>
                        PDF
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
