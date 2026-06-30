'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import type { KeywordResearchResult, Project, Keyword } from '@/lib/types/shared';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

function difficultyBadgeVariant(d: number): 'success' | 'warning' | 'destructive' {
  if (d <= 33) return 'success';
  if (d <= 66) return 'warning';
  return 'destructive';
}

const COUNTRY_OPTIONS = [
  { code: 'FR', name: 'France' }, { code: 'US', name: 'États-Unis' },
  { code: 'GB', name: 'Royaume-Uni' }, { code: 'DE', name: 'Allemagne' },
  { code: 'ES', name: 'Espagne' }, { code: 'IT', name: 'Italie' },
  { code: 'CA', name: 'Canada' }, { code: 'AU', name: 'Australie' },
];

const LANG_OPTIONS = [
  { code: 'fr', name: 'Français' }, { code: 'en', name: 'Anglais' },
  { code: 'de', name: 'Allemand' }, { code: 'es', name: 'Espagnol' },
  { code: 'it', name: 'Italien' },
];

export default function AgencyKeywordResearchPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [country, setCountry] = useState('FR');
  const [language, setLanguage] = useState('fr');
  const [enabled, setEnabled] = useState(false);
  const [sortBy, setSortBy] = useState<'volume' | 'cpc' | 'difficulty'>('volume');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [addModal, setAddModal] = useState<{ keyword: string; country: string; language: string } | null>(null);
  const [selectedProject, setSelectedProject] = useState('');

  const { data: results = [], isFetching, error } = useQuery({
    queryKey: ['keyword-research', searchQuery, country, language],
    queryFn: () => apiFetch<KeywordResearchResult[]>(`/keyword-research/search?query=${encodeURIComponent(searchQuery)}&country=${country}&language=${language}`),
    enabled,
    retry: false,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiFetch<Project[]>('/projects'),
  });

  const { data: usage } = useQuery({
    queryKey: ['usage'],
    queryFn: () => apiFetch<{ usage: { keywordSearchesToday: number }; limits: { maxKeywordSearchesPerDay: number } }>('/me/usage'),
  });

  const addMutation = useMutation({
    mutationFn: (data: { keyword: string; projectId: string; countryCode: string; languageCode: string }) =>
      apiFetch('/keyword-research/add-to-project', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { setAddModal(null); setSelectedProject(''); queryClient.invalidateQueries({ queryKey: ['keywords'] }); },
    onError: (e: ApiError) => alert(e.message),
  });

  const handleSearch = useCallback(() => { if (searchQuery.trim()) setEnabled(true); }, [searchQuery]);

  const sortedResults = [...results].sort((a, b) => {
    const mul = sortDir === 'desc' ? -1 : 1;
    if (sortBy === 'volume') return (a.volume - b.volume) * mul;
    if (sortBy === 'cpc') return (a.cpc - b.cpc) * mul;
    return (a.difficulty - b.difficulty) * mul;
  });

  const searchesUsed = usage?.usage?.keywordSearchesToday ?? 0;
  const searchesLimit = usage?.limits?.maxKeywordSearchesPerDay ?? 0;
  const is403 = error && (error as ApiError)?.status === 403;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Recherche de mots-clés</h1>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1"><label className="block text-xs font-medium text-muted-foreground mb-1">Requête</label><Input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setEnabled(false); }} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="ex. référencement naturel" /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Pays</label><Select value={country} onChange={e => setCountry(e.target.value)}>{COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</Select></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Langue</label><Select value={language} onChange={e => setLanguage(e.target.value)}>{LANG_OPTIONS.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}</Select></div>
            <Button onClick={handleSearch} disabled={!searchQuery.trim() || isFetching}>{isFetching ? 'Recherche...' : 'Rechercher'}</Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">{searchesUsed}/{searchesLimit} recherches utilisées aujourd&apos;hui</div>

      {is403 && <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">Limite de recherches quotidienne atteinte. <a href="/agency/billing" className="underline font-medium">Augmentez votre offre</a> pour plus de recherches.</div>}

      {isFetching && <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>}

      {!isFetching && results.length === 0 && enabled && !is403 && <p className="text-sm text-muted-foreground text-center py-8">Aucun résultat trouvé</p>}

      {results.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mot-clé</TableHead>
                {(['volume', 'cpc', 'difficulty'] as const).map(col => (
                  <TableHead key={col} className="text-right cursor-pointer hover:text-foreground" onClick={() => { if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(col); setSortDir('desc'); } }}>
                    {col === 'volume' ? 'Volume' : col === 'cpc' ? 'CPC' : 'Difficulté'}{sortBy === col ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                  </TableHead>
                ))}
                <TableHead className="text-right">Concurrence</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedResults.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm font-medium">{r.keyword}</TableCell>
                  <TableCell className="text-right">{r.volume.toLocaleString()}</TableCell>
                  <TableCell className="text-right">€{r.cpc.toFixed(2)}</TableCell>
                  <TableCell className="text-right"><Badge variant={difficultyBadgeVariant(r.difficulty)}>{r.difficulty}</Badge></TableCell>
                  <TableCell className="text-right">{(r.competition * 100).toFixed(0)}%</TableCell>
                  <TableCell className="text-right"><Button variant="link" size="sm" onClick={() => setAddModal({ keyword: r.keyword, country, language })}>+ Ajouter</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!addModal} onClose={() => setAddModal(null)}>
        <DialogHeader><DialogTitle>Ajouter au projet</DialogTitle><DialogDescription>Mot-clé : <strong>{addModal?.keyword}</strong></DialogDescription></DialogHeader>
        <Select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="w-full mb-4"><option value="">Sélectionnez un projet...</option>{projects.map(p => (<option key={p.id} value={p.id}>{p.name} ({p.domain})</option>))}</Select>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setAddModal(null)}>Annuler</Button>
          <Button onClick={() => { if (!selectedProject || !addModal) return; addMutation.mutate({ keyword: addModal.keyword, projectId: selectedProject, countryCode: addModal.country, languageCode: addModal.language }); }} disabled={!selectedProject || addMutation.isPending}>{addMutation.isPending ? 'Ajout...' : 'Ajouter'}</Button>
        </div>
      </Dialog>
    </div>
  );
}
