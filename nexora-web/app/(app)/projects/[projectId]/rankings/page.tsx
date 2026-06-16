'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError, API_URL } from '@/lib/api';
import type { KeywordWithPosition, KeywordPosition, VisibilityPoint, GainsLosses } from '@/lib/types/shared';
import { useParams } from 'next/navigation';
import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

type ProjectSummary = {
  totalKeywords: number;
  avgPosition: number | null;
  gained30d: number;
  lost30d: number;
};

function todayStr() {
  return new Date().toISOString().split('T')[0];
}
function thirtyDaysAgoStr() {
  const d = new Date(); d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
}

function KeywordRow({ kw, defaultExpanded }: { kw: KeywordWithPosition; defaultExpanded: boolean }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ['keyword-positions', kw.id],
    queryFn: () => apiFetch<KeywordPosition[]>(`/keywords/${kw.id}/positions?from=${thirtyDaysAgoStr()}`),
    enabled: expanded,
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/keywords/${kw.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords-with-positions'] });
      queryClient.invalidateQueries({ queryKey: ['keywords-summary'] });
      queryClient.invalidateQueries({ queryKey: ['keywords-visibility'] });
      queryClient.invalidateQueries({ queryKey: ['keywords-gains-losses'] });
    },
  });

  const posHistory = history.filter(p => p.position !== null);

  return (
    <div className="border-b last:border-0">
      <div
        className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="flex-1 text-sm font-medium truncate">{kw.keyword}</span>
        <span className="text-xs text-muted-foreground w-8">{kw.countryCode}</span>
        <span className="text-xs text-muted-foreground w-16">{kw.device}</span>
        <span className="text-sm font-semibold w-16 text-center">
          {kw.currentPosition !== null ? `#${kw.currentPosition}` : '-'}
        </span>
        <span className={`text-xs w-12 text-center font-medium ${
          kw.change7d !== null ? (kw.change7d > 0 ? 'text-success' : kw.change7d < 0 ? 'text-destructive' : '') : ''
        }`}>
          {kw.change7d !== null ? (kw.change7d > 0 ? `+${kw.change7d}` : kw.change7d < 0 ? `${kw.change7d}` : '-') : '-'}
        </span>
        <span className="text-xs text-muted-foreground w-24 text-center">
          {kw.lastChecked ? new Date(kw.lastChecked).toLocaleDateString('fr') : '-'}
        </span>
        <span
          className="text-xs text-destructive hover:underline cursor-pointer"
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
        >
          Supprimer
        </span>
      </div>

      {confirmDelete && (
        <div className="flex items-center gap-2 px-4 pb-3">
          <span className="text-xs text-muted-foreground">Supprimer ce mot-clé ?</span>
          <Button
            size="xs"
            variant="destructive"
            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(); setConfirmDelete(false); }}
          >
            Confirmer
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
          >
            Annuler
          </Button>
        </div>
      )}

      {expanded && posHistory.length > 0 && (
        <div className="px-4 pb-3">
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={posHistory.map(p => ({ ...p, pos: p.position }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis reversed domain={[1, 50]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="pos" stroke="var(--brand)" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function RankingsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addKeyword, setAddKeyword] = useState('');
  const [addCountry, setAddCountry] = useState('FR');
  const [addLang, setAddLang] = useState('fr');
  const [addDevice, setAddDevice] = useState('desktop');
  const [addError, setAddError] = useState('');
  const [exporting, setExporting] = useState(false);

  const { data: usage } = useQuery({
    queryKey: ['usage'],
    queryFn: () => apiFetch<{ plan: string; limits: { pdfExport: boolean } }>('/me/usage'),
  });
  const canExportPdf = usage?.limits?.pdfExport ?? false;

  const [sortBy, setSortBy] = useState<'keyword' | 'position' | 'change'>('keyword');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');

  const { data: keywordsWithPos = [] } = useQuery({
    queryKey: ['keywords-with-positions', projectId],
    queryFn: () => apiFetch<KeywordWithPosition[]>(`/projects/${projectId}/keywords/with-positions`),
  });

  const { data: summary } = useQuery({
    queryKey: ['keywords-summary', projectId],
    queryFn: () => apiFetch<ProjectSummary>(`/projects/${projectId}/keywords/summary`),
  });

  const { data: visibility } = useQuery({
    queryKey: ['keywords-visibility', projectId],
    queryFn: () => apiFetch<VisibilityPoint[]>(`/projects/${projectId}/keywords/visibility`),
  });

  const { data: gainsLosses } = useQuery({
    queryKey: ['keywords-gains-losses', projectId],
    queryFn: () => apiFetch<GainsLosses>(`/projects/${projectId}/keywords/summary/gains-losses`),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/projects/${projectId}/keywords`, {
        method: 'POST',
        body: JSON.stringify({
          keyword: addKeyword,
          countryCode: addCountry,
          languageCode: addLang,
          device: addDevice,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords-with-positions', projectId] });
      queryClient.invalidateQueries({ queryKey: ['keywords-summary', projectId] });
      setShowAddPanel(false);
      setAddKeyword('');
      setAddError('');
    },
    onError: (e: ApiError) => setAddError(e.message),
  });

  const countries = useMemo(() => [...new Set(keywordsWithPos.map(k => k.countryCode))], [keywordsWithPos]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const sortedKeywords = useMemo(() => {
    let filtered = keywordsWithPos;
    if (deviceFilter) filtered = filtered.filter(k => k.device === deviceFilter);
    if (countryFilter) filtered = filtered.filter(k => k.countryCode === countryFilter);

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'keyword') {
        cmp = a.keyword.localeCompare(b.keyword);
      } else if (sortBy === 'position') {
        const pa = a.currentPosition ?? 999;
        const pb = b.currentPosition ?? 999;
        cmp = pa - pb;
      } else if (sortBy === 'change') {
        const ca = a.change7d ?? 0;
        const cb = b.change7d ?? 0;
        cmp = cb - ca;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [keywordsWithPos, deviceFilter, countryFilter, sortBy, sortDir]);

  const sortIndicator = (col: typeof sortBy) => {
    if (sortBy !== col) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Positions</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              if (!canExportPdf) return;
              setExporting(true);
              try {
                const res = await fetch(`${API_URL}/reports/project/${projectId}/rankings/pdf`, { credentials: 'include' });
                if (!res.ok) return;
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `nexora-rankings-${projectId}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              } finally {
                setExporting(false);
              }
            }}
            disabled={exporting || !canExportPdf}
            title={!canExportPdf ? 'Disponible sur les plans Pro & Agence' : ''}
          >
            {exporting ? 'Génération...' : 'Exporter PDF'}
          </Button>
          <Button onClick={() => setShowAddPanel(true)}>
            + Ajouter un mot-clé
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-5">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Mots-clés</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xl font-bold">{summary?.totalKeywords ?? '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Position moy.</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xl font-bold">{summary?.avgPosition ?? '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Gagnés (30j)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xl font-bold text-success">{summary?.gained30d ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Perdus (30j)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xl font-bold text-destructive">{summary?.lost30d ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Visibilité</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xl font-bold">
              {visibility && visibility.length > 0 ? `${visibility[visibility.length - 1].score}%` : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {visibility && visibility.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tendance de visibilité (90 jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={visibility}>
                <defs>
                  <linearGradient id="visGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="score" stroke="var(--brand)" fill="url(#visGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {gainsLosses && (gainsLosses.gains.length > 0 || gainsLosses.losses.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-success">Meilleures progressions (30j)</CardTitle>
            </CardHeader>
            <CardContent>
              {gainsLosses.gains.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun changement significatif ces 30 derniers jours.</p>
              ) : (
                gainsLosses.gains.slice(0, 10).map((g, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span className="truncate">{g.keyword}</span>
                    <span className="text-success font-medium whitespace-nowrap">
                      {g.from} → {g.to} (+{g.change}) ↑
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-destructive">Plus fortes baisses (30j)</CardTitle>
            </CardHeader>
            <CardContent>
              {gainsLosses.losses.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun changement significatif ces 30 derniers jours.</p>
              ) : (
                gainsLosses.losses.slice(0, 10).map((l, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span className="truncate">{l.keyword}</span>
                    <span className="text-destructive font-medium whitespace-nowrap">
                      {l.from} → {l.to} (-{l.change}) ↓
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground">Filtres :</span>
          <Select
            value={deviceFilter}
            onChange={e => setDeviceFilter(e.target.value)}
            className="w-auto"
          >
            <option value="">Tous les appareils</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
          </Select>
          <Select
            value={countryFilter}
            onChange={e => setCountryFilter(e.target.value)}
            className="w-auto"
          >
            <option value="">Tous les pays</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">{keywordsWithPos.length} mots-clés</span>
        </div>

        <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
          <button className="flex-1 text-left hover:text-foreground" onClick={() => toggleSort('keyword')}>
            Mot-clé{sortIndicator('keyword')}
          </button>
          <span className="w-8">Pays</span>
          <span className="w-16">Appareil</span>
          <button className="w-16 text-center hover:text-foreground" onClick={() => toggleSort('position')}>
            Position{sortIndicator('position')}
          </button>
          <button className="w-12 text-center hover:text-foreground" onClick={() => toggleSort('change')}>
            7j Δ{sortIndicator('change')}
          </button>
          <span className="w-24 text-center">Dernière vérif.</span>
          <span className="w-12"></span>
        </div>

        {sortedKeywords.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucun mot-clé suivi. Ajoutez votre premier mot-clé pour commencer.
          </p>
        )}

        {sortedKeywords.map(kw => (
          <KeywordRow key={kw.id} kw={kw} defaultExpanded={false} />
        ))}
      </Card>

      {showAddPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowAddPanel(false)} />
          <div className="relative w-full max-w-md bg-background shadow-xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Ajouter un mot-clé</h2>
              <button
                onClick={() => setShowAddPanel(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {addError && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3 mb-4">{addError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Mot-clé</label>
                <Input
                  value={addKeyword}
                  onChange={e => setAddKeyword(e.target.value)}
                  placeholder="ex. référencement naturel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Pays</label>
                <Select
                  value={addCountry}
                  onChange={e => setAddCountry(e.target.value)}
                >
                  <option value="FR">France</option>
                  <option value="US">États-Unis</option>
                  <option value="GB">Royaume-Uni</option>
                  <option value="DE">Allemagne</option>
                  <option value="ES">Espagne</option>
                  <option value="IT">Italie</option>
                  <option value="CA">Canada</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Langue</label>
                <Select
                  value={addLang}
                  onChange={e => setAddLang(e.target.value)}
                >
                  <option value="fr">Français</option>
                  <option value="en">Anglais</option>
                  <option value="de">Allemand</option>
                  <option value="es">Espagnol</option>
                  <option value="it">Italien</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Appareil</label>
                <Select
                  value={addDevice}
                  onChange={e => setAddDevice(e.target.value)}
                >
                  <option value="desktop">Desktop</option>
                  <option value="mobile">Mobile</option>
                </Select>
              </div>
              <Button
                onClick={() => addMutation.mutate()}
                disabled={!addKeyword || addMutation.isPending}
                className="w-full"
              >
                {addMutation.isPending ? 'Ajout...' : 'Ajouter le mot-clé'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
