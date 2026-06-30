'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Agency, Project, ReportV2 } from '@/lib/types/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState('');

  const { data: agencies, isLoading: agenciesLoading } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => apiFetch<Agency[]>('/agencies'),
  });

  const agency = agencies?.[0];

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiFetch<Project[]>('/projects'),
    enabled: !!agency,
  });

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['agency-reports', agency?.id],
    queryFn: () => apiFetch<ReportV2[]>(`/agencies/${agency!.id}/reports`),
    enabled: !!agency,
  });

  const generateMutation = useMutation({
    mutationFn: (projectId: string) =>
      apiFetch(`/reports/project/${projectId}/generate`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-reports', agency?.id] });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: (reportId: string) =>
      apiFetch<{ signedUrl: string }>(`/reports/${reportId}/pdf`),
    onSuccess: (data) => {
      window.open(data.signedUrl, '_blank');
    },
  });

  const isLoading = agenciesLoading || reportsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!agency) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rapports</h1>
          <p className="text-sm text-muted-foreground">Rapports SEO pour vos clients</p>
        </div>
        <div className="flex gap-2">
          <Select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
          >
            <option value="">Sélectionnez un projet</option>
            {projects?.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          <Button
            onClick={() => {
              if (selectedProject) generateMutation.mutate(selectedProject);
            }}
            disabled={!selectedProject || generateMutation.isPending}
          >
            {generateMutation.isPending ? 'Génération...' : 'Générer un rapport'}
          </Button>
        </div>
      </div>

      {generateMutation.isError && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">
          Erreur lors de la génération du rapport
        </div>
      )}

      <Card>
        <CardContent>
          {!reports || reports.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">Aucun rapport pour le moment</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Période</TableHead>
                  <TableHead>Score SEO</TableHead>
                  <TableHead>Score IA</TableHead>
                  <TableHead>Score Croissance</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map(report => (
                  <TableRow key={report.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/agency/reports/${report.id}`)}>
                    <TableCell className="text-sm font-medium capitalize">
                      {report.periodType === 'weekly' ? 'Hebdomadaire' : report.periodType === 'monthly' ? 'Mensuel' : 'Trimestriel'}
                    </TableCell>
                    <TableCell>
                      {report.seoScore !== null ? (
                        <Badge variant={report.seoScore >= 80 ? 'success' : report.seoScore >= 50 ? 'warning' : 'destructive'}>
                          {report.seoScore}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">–</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {report.aiScore !== null ? (
                        <Badge variant={report.aiScore >= 80 ? 'success' : report.aiScore >= 50 ? 'warning' : 'destructive'}>
                          {report.aiScore}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">–</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {report.growthScore !== null ? (
                        <Badge variant={report.growthScore >= 80 ? 'success' : report.growthScore >= 50 ? 'warning' : 'destructive'}>
                          {report.growthScore}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">–</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(report.createdAt).toLocaleDateString('fr')}
                    </TableCell>
                    <TableCell className="text-right">
                      {report.signedUrl ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadMutation.mutate(report.id)}
                          disabled={downloadMutation.isPending}
                        >
                          PDF
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Non disponible</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
