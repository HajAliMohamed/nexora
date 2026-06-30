'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  domain: string;
}

interface Audit {
  id: string;
  projectId: string;
  status: string;
  score: number | null;
  pagesCrawled: number;
  createdAt: string;
}

interface Report {
  id: string;
  projectId: string;
  seoScore: number | null;
  aiScore: number | null;
  growthScore: number | null;
  periodType: string;
  createdAt: string;
}

export default function ClientDashboardPage() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<{ id: string; email: string; name?: string }>('/me'),
  });

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['client-dashboard'],
    queryFn: () => apiFetch<{ projects: Project[]; audits: Audit[]; reports: Report[] }>('/reports/client-dashboard'),
  });

  const isLoading = userLoading || dashLoading;
  const { projects = [], audits = [], reports = [] } = dashboard || {};

  const latestAudit = audits[0];
  const latestReport = reports[0];

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
                : latestAudit?.score !== null && latestAudit?.score !== undefined
                  ? latestAudit.score
                  : '–'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Projets</p>
            <p className="text-3xl font-bold mt-1">{projects.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Audits réalisés</p>
            <p className="text-3xl font-bold mt-1">{audits.length}</p>
          </CardContent>
        </Card>
      </div>

      {audits.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Audits récents</CardTitle>
                <CardDescription>Vos derniers audits SEO</CardDescription>
              </div>
              <Link href="/client/projects" className="text-sm text-brand hover:underline">
                Voir tout
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {audits.slice(0, 5).map(audit => {
                const project = projects.find(p => p.id === audit.projectId);
                return (
                  <div key={audit.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{project?.domain || project?.name || 'Projet'}</p>
                      <p className="text-xs text-muted-foreground">
                        {audit.pagesCrawled} pages crawlées · {new Date(audit.createdAt).toLocaleDateString('fr')}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      {audit.score !== null && (
                        <Badge variant={audit.score >= 80 ? 'success' : audit.score >= 50 ? 'warning' : 'destructive'}>
                          Score: {audit.score}
                        </Badge>
                      )}
                      <Badge variant="outline">{audit.status}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {reports.length > 0 && (
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
          </CardContent>
        </Card>
      )}

      {audits.length === 0 && reports.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Aucun audit ou rapport disponible pour le moment. Votre agence doit d&apos;abord lancer un audit sur vos projets.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
