'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import type { SiteAudit } from '@/lib/types/shared';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

const STATUS_BADGE_VARIANT: Record<string, 'secondary' | 'default' | 'success' | 'destructive'> = {
  pending: 'secondary',
  running: 'default',
  done: 'success',
  failed: 'destructive',
};

const STATUS_TEXT: Record<string, string> = {
  pending: 'En attente',
  running: 'En cours',
  done: 'Terminé',
  failed: 'Échec',
};

export default function AgencyProjectAuditsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.id as string;
  const [error, setError] = useState('');

  const { data: audits, isFetching } = useQuery({
    queryKey: ['audits', projectId],
    queryFn: () => apiFetch<SiteAudit[]>(`/projects/${projectId}/audits`),
    refetchInterval: (q: any) =>
      (q.state.data as SiteAudit[] | undefined)?.some((a: SiteAudit) => a.status === 'pending' || a.status === 'running') ? 5000 : false,
  });

  const launchMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/projects/${projectId}/audits`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits', projectId] });
      setError('');
    },
    onError: (e: ApiError) => setError(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Audits du site</h1>
        <Button
          onClick={() => launchMutation.mutate()}
          disabled={launchMutation.isPending}
        >
          {launchMutation.isPending ? 'Lancement...' : 'Lancer un audit'}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>
      )}

      {audits && audits.length === 0 && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Pas encore d&apos;audit</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Lancez votre premier audit SEO pour commencer
            </p>
          </CardHeader>
        </Card>
      )}

      {audits && audits.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.map(a => (
                <TableRow
                  key={a.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/agency/projects/${projectId}/audits/${a.id}`)}
                >
                  <TableCell>{new Date(a.createdAt).toLocaleDateString('fr')}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[a.status] || 'secondary'}>
                      {a.status === 'running' ? '⟳ ' : ''}{STATUS_TEXT[a.status] || a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {a.score !== null ? `${a.score}/100` : '-'}
                  </TableCell>
                  <TableCell>{a.pagesCrawled}</TableCell>
                  <TableCell>
                    <span className="text-brand hover:underline text-xs font-medium">Détails</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
