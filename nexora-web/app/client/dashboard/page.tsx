'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { ReportV2 } from '@/lib/types/shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function ClientDashboardPage() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<{ id: string; email: string; name?: string }>('/me'),
  });

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiFetch<ReportV2[]>('/reports'),
  });

  const latestReport = reports?.[0];
  const isLoading = userLoading || reportsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bonjour {user?.name || user?.email?.split('@')[0] || ''}
        </h1>
        <p className="text-sm text-muted-foreground">Bienvenue dans votre espace client</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Score SEO</p>
            <p className="text-3xl font-bold mt-1">
              {latestReport?.seoScore !== null && latestReport?.seoScore !== undefined
                ? latestReport.seoScore
                : '–'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Score IA</p>
            <p className="text-3xl font-bold mt-1">
              {latestReport?.aiScore !== null && latestReport?.aiScore !== undefined
                ? latestReport.aiScore
                : '–'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Score Croissance</p>
            <p className="text-3xl font-bold mt-1">
              {latestReport?.growthScore !== null && latestReport?.growthScore !== undefined
                ? latestReport.growthScore
                : '–'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rapports récents</CardTitle>
              <CardDescription>Vos derniers rapports SEO</CardDescription>
            </div>
            <Link href="/client/reports" className="text-sm text-brand hover:underline">
              Voir tout
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {!reports || reports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun rapport disponible pour le moment
            </p>
          ) : (
            <div className="space-y-3">
              {reports.slice(0, 3).map(report => (
                <div key={report.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium capitalize">
                      Rapport {report.periodType === 'weekly' ? 'hebdomadaire' : report.periodType === 'monthly' ? 'mensuel' : 'trimestriel'}
                    </p>
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
    </div>
  );
}
