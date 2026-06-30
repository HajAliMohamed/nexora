'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { ReportV2, AiSearchData, GrowthData } from '@/lib/types/shared';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { NarrativeBlock } from '@/components/narrative-block';
import { ArrowLeft, FileText, Sparkles, TrendingUp, Lightbulb } from 'lucide-react';

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.reportId as string;

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => apiFetch<ReportV2>(`/reports/${reportId}`),
  });

  const projectId = (report as any)?.projectId;

  const { data: aiData } = useQuery({
    queryKey: ['ai-search', projectId],
    queryFn: () => apiFetch<AiSearchData>(`/projects/${projectId}/ai-search`),
    enabled: !!projectId,
  });

  const { data: growthData } = useQuery({
    queryKey: ['growth', projectId],
    queryFn: () => apiFetch<GrowthData>(`/projects/${projectId}/growth`),
    enabled: !!projectId,
  });

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40" />
      <Skeleton className="h-32" />
    </div>
  );

  if (!report) return <p className="text-sm text-muted-foreground">Rapport introuvable</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Rapport SEO + IA Search</h1>
            <p className="text-sm text-muted-foreground">
              {(report as any).periodType === 'monthly' ? 'Mensuel' : (report as any).periodType} — {new Date((report as any).createdAt).toLocaleDateString('fr')}
            </p>
          </div>
        </div>
        {(report as any).signedUrl && (
          <Button variant="outline" className="gap-1.5" onClick={() => window.open((report as any).signedUrl, '_blank')}>
            <FileText className="h-4 w-4" />
            Télécharger PDF
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">SEO Health</p>
            <div className="text-3xl font-bold">
              <Badge variant={(report as any).seoScore >= 80 ? 'success' : (report as any).seoScore >= 50 ? 'warning' : 'destructive'} className="text-xl px-3 py-1">
                {(report as any).seoScore ?? '–'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">/ 100</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">AI Visibility</p>
            <div className="text-3xl font-bold">
              <Badge variant={(report as any).aiScore >= 80 ? 'success' : (report as any).aiScore >= 50 ? 'warning' : 'destructive'} className="text-xl px-3 py-1">
                {(report as any).aiScore ?? '–'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">/ 100</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">Growth Potential</p>
            <div className="text-3xl font-bold">
              <Badge variant={(report as any).growthScore >= 80 ? 'success' : (report as any).growthScore >= 50 ? 'warning' : 'destructive'} className="text-xl px-3 py-1">
                {(report as any).growthScore ?? '–'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">/ 100</p>
          </CardContent>
        </Card>
      </div>

      {(report as any).narrative && (
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">Résumé narratif</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{(report as any).narrative}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-base">Opportunités IA</CardTitle>
          </CardHeader>
          <CardContent>
            {aiData?.opportunities && aiData.opportunities.length > 0 ? (
              <div className="space-y-2">
                {aiData.opportunities.map((opp, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs">
                    <span className="truncate">{opp.prompt}</span>
                    <Badge variant="outline" className="shrink-0 ml-2">{opp.source}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Aucune opportunité IA détectée</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cyan-500" />
            <CardTitle className="text-base">Opportunités SEO</CardTitle>
          </CardHeader>
          <CardContent>
            {growthData?.pages && growthData.pages.length > 0 ? (
              <div className="space-y-2">
                {growthData.pages.slice(0, 5).map((page, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs">
                    <span className="truncate">{page.url}</span>
                    <span className={page.delta > 0 ? 'text-success shrink-0 ml-2' : 'text-destructive shrink-0 ml-2'}>
                      {page.delta > 0 ? '+' : ''}{page.delta}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Aucune opportunité SEO détectée</p>
            )}
          </CardContent>
        </Card>
      </div>

      {(report as any).recommendations && (report as any).recommendations.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <FileText className="h-5 w-5 text-brand" />
            <CardTitle className="text-base">Actions prioritaires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(report as any).recommendations.map((rec: any, i: number) => (
                <div key={i} className="flex items-start gap-3 rounded-md border border-border p-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{rec.title || rec.action}</p>
                    {rec.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
