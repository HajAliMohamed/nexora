'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { ReportV2 } from '@/lib/types/shared';

export default function ClientProjectDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => apiFetch<{ id: string; name: string; domain: string; countryCode: string; languageCode: string }[]>('/me/projects').then(projects => {
      const p = projects.find(pr => pr.id === id);
      if (!p) throw new Error('Projet non trouvé');
      return p;
    }),
  });

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['project-reports', id],
    queryFn: () => apiFetch<ReportV2[]>(`/reports/project/${id}`),
  });

  const isLoading = projectLoading || reportsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Projet non trouvé</h1>
        <Link href="/client/projects">
          <Button variant="outline">Retour aux projets</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/client/projects" className="text-sm text-brand hover:underline">← Retour aux projets</Link>
          <h1 className="text-2xl font-bold tracking-tight mt-1">{project.name}</h1>
          <p className="text-sm text-muted-foreground">{project.domain}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{project.countryCode?.toUpperCase()}</Badge>
          <Badge variant="outline">{project.languageCode?.toUpperCase()}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rapports</CardTitle>
        </CardHeader>
        <CardContent>
          {!reports || reports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun rapport disponible</p>
          ) : (
            <div className="space-y-3">
              {reports.map(report => (
                <div key={report.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium capitalize">
                      Rapport {report.periodType === 'weekly' ? 'hebdomadaire' : report.periodType === 'monthly' ? 'mensuel' : 'trimestriel'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(report.createdAt).toLocaleDateString('fr')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
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
