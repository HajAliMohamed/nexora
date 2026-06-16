'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import type { CompetitorOverview, KeywordDiffResult, Project, PlanLimits } from '@/lib/types/shared';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export default function CompetitorsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();
  const [domainInput, setDomainInput] = useState('');
  const [addError, setAddError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiFetch<Project>(`/projects/${projectId}`),
  });

  const { data: overview } = useQuery({
    queryKey: ['competitors-overview', projectId],
    queryFn: () => apiFetch<CompetitorOverview>(`/projects/${projectId}/competitors/overview`),
  });

  const { data: keywordsDiff } = useQuery({
    queryKey: ['competitors-keywords-diff', projectId],
    queryFn: () => apiFetch<KeywordDiffResult[]>(`/projects/${projectId}/competitors/keywords-diff`),
  });

  const { data: usage } = useQuery({
    queryKey: ['usage'],
    queryFn: () => apiFetch<{ limits: PlanLimits; usage: { projects: number } }>('/me/usage'),
  });

  const { data: competitors = [] } = useQuery({
    queryKey: ['competitors', projectId],
    queryFn: () => apiFetch<{ id: string; domain: string }[]>(`/projects/${projectId}/competitors`),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/projects/${projectId}/competitors`, {
        method: 'POST',
        body: JSON.stringify({ domain: domainInput }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors', projectId] });
      queryClient.invalidateQueries({ queryKey: ['competitors-overview', projectId] });
      setDomainInput('');
      setAddError('');
    },
    onError: (e: ApiError) => setAddError(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/projects/${projectId}/competitors/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors', projectId] });
      queryClient.invalidateQueries({ queryKey: ['competitors-overview', projectId] });
      setConfirmRemove(null);
    },
  });

  const maxCompetitors = usage?.limits.maxCompetitorsPerProject ?? 0;
  const atLimit = competitors.length >= maxCompetitors;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Analyse concurrentielle</h1>
      <p className="text-sm text-muted-foreground">{project?.domain}</p>

      <div className="grid gap-4 sm:grid-cols-3">
        {overview && (
          <>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium">{project?.domain}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold mt-2">{overview.projectKeywordsTop10}</p>
                <p className="text-xs text-muted-foreground">mots-clés dans le top 10</p>
                <p className="text-lg font-semibold mt-1">{overview.projectEstimatedTraffic.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">trafic estimé / mois</p>
              </CardContent>
            </Card>
            {overview.competitors.map(c => (
              <Card key={c.id}>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium">{c.domain}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-2xl font-bold mt-2 text-muted-foreground">{c.keywordsTop10}</p>
                  <p className="text-xs text-muted-foreground">mots-clés dans le top 10</p>
                  <p className="text-lg font-semibold mt-1 text-muted-foreground">{c.estimatedTraffic.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">trafic estimé / mois</p>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>

      {overview && overview.competitors.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Ajoutez des concurrents pour voir les données de comparaison
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Gérer les concurrents ({competitors.length}/{maxCompetitors})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {addError && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3 mb-3">{addError}</div>
          )}

          <div className="flex gap-2 mb-4">
            <Input
              value={domainInput}
              onChange={e => setDomainInput(e.target.value)}
              placeholder="example.com"
              disabled={atLimit}
            />
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!domainInput.trim() || addMutation.isPending || atLimit}
              title={atLimit ? 'Limite de concurrents atteinte' : ''}
            >
              {addMutation.isPending ? 'Ajout...' : 'Ajouter'}
            </Button>
          </div>

          {atLimit && (
            <p className="text-xs text-destructive mb-3">
              Limite de concurrents atteinte. <a href="/billing" className="underline font-medium">Augmentez votre offre</a> pour en ajouter plus.
            </p>
          )}

          <div className="space-y-1">
            {competitors.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm">{c.domain}</span>
                {confirmRemove === c.id ? (
                  <div className="flex gap-2">
                    <span className="text-xs text-muted-foreground">Supprimer ?</span>
                    <Button size="xs" variant="destructive" onClick={() => removeMutation.mutate(c.id)}>
                      Confirmer
                    </Button>
                    <Button size="xs" variant="outline" onClick={() => setConfirmRemove(null)}>
                      Annuler
                    </Button>
                  </div>
                ) : (
                  <Button size="xs" variant="destructive" onClick={() => setConfirmRemove(c.id)}>
                    Supprimer
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Comparaison de mots-clés</CardTitle>
        </CardHeader>
        {keywordsDiff && keywordsDiff.length === 0 ? (
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-4">Aucun mot-clé suivi</p>
          </CardContent>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mot-clé</TableHead>
                  <TableHead className="text-right">Votre position</TableHead>
                  {overview?.competitors.map(c => (
                    <TableHead key={c.id} className="text-right">{c.domain}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywordsDiff?.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{row.keyword}</TableCell>
                    <TableCell className="text-right font-medium">
                      {row.yourPosition !== null ? `#${row.yourPosition}` : '-'}
                    </TableCell>
                    {row.competitorPositions.map((cp, j) => (
                      <TableCell key={j} className="text-right text-muted-foreground">
                        {cp.position !== null ? `#${cp.position}` : '-'}
                      </TableCell>
                    ))}
                    {overview && row.competitorPositions.length === 0 && overview.competitors.map(c => (
                      <TableCell key={c.id} className="text-right text-muted-foreground">–</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground px-4 py-2 border-t">
              Données de positionnement concurrent bientôt disponibles
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
