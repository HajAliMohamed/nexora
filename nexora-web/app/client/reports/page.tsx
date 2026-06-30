'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { ReportV2 } from '@/lib/types/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function ClientReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportV2 | null>(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiFetch<ReportV2[]>('/reports'),
  });

  const downloadMutation = useMutation({
    mutationFn: (reportId: string) =>
      apiFetch<{ signedUrl: string }>(`/reports/${reportId}/pdf`),
    onSuccess: (data) => {
      window.open(data.signedUrl, '_blank');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rapports</h1>
        <p className="text-sm text-muted-foreground">Consultez vos rapports SEO</p>
      </div>

      <Card>
        <CardContent>
          {!reports || reports.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">Aucun rapport disponible</p>
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
                  <TableRow key={report.id}>
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
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedReport(report)}
                        >
                          Détails
                        </Button>
                        {report.signedUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadMutation.mutate(report.id)}
                            disabled={downloadMutation.isPending}
                          >
                            PDF
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedReport} onClose={() => setSelectedReport(null)}>
        <DialogHeader>
          <DialogTitle>
            Rapport {selectedReport?.periodType === 'weekly' ? 'hebdomadaire' : selectedReport?.periodType === 'monthly' ? 'mensuel' : 'trimestriel'}
          </DialogTitle>
          <DialogDescription>
            {selectedReport && new Date(selectedReport.createdAt).toLocaleDateString('fr')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground">SEO</p>
              <p className="text-2xl font-bold mt-1">{selectedReport?.seoScore ?? '–'}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground">IA</p>
              <p className="text-2xl font-bold mt-1">{selectedReport?.aiScore ?? '–'}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground">Croissance</p>
              <p className="text-2xl font-bold mt-1">{selectedReport?.growthScore ?? '–'}</p>
            </div>
          </div>

          {selectedReport?.narrative && (
            <div>
              <h4 className="text-sm font-medium mb-2">Analyse</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedReport.narrative}</p>
            </div>
          )}

          {selectedReport?.recommendations && selectedReport.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Recommandations</h4>
              <div className="space-y-2">
                {selectedReport.recommendations.map((rec, i) => (
                  <div key={i} className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium">{rec.title}</p>
                      <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'warning' : 'secondary'}>
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{rec.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            {selectedReport?.signedUrl && (
              <Button
                onClick={() => {
                  if (selectedReport) window.open(selectedReport.signedUrl!, '_blank');
                }}
              >
                Télécharger le PDF
              </Button>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
