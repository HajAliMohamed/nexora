'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, API_URL } from '@/lib/api';
import type { SiteAudit, AuditIssue } from '@/lib/types/shared';
import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select } from '@/components/ui/select';

const SEVERITY_BADGE_VARIANT: Record<string, 'destructive' | 'warning' | 'default' | 'secondary'> = {
  critical: 'destructive',
  high: 'warning',
  medium: 'default',
  low: 'secondary',
};

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

export default function AgencyAuditDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.id as string;
  const auditId = params.auditId as string;

  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);

  const { data: usage } = useQuery({
    queryKey: ['usage'],
    queryFn: () => apiFetch<{ plan: string; limits: { pdfExport: boolean } }>('/me/usage'),
  });

  const canExportPdf = usage?.limits?.pdfExport ?? false;
  const PER_PAGE = 25;
  const queryStr = new URLSearchParams();
  if (severityFilter) queryStr.set('severity', severityFilter);
  if (typeFilter) queryStr.set('type', typeFilter);

  const { data: audit } = useQuery({
    queryKey: ['audit', auditId],
    queryFn: () => apiFetch<SiteAudit>(`/audits/${auditId}`),
    refetchInterval: (q: any) => {
      const a = q.state.data as SiteAudit | undefined;
      return a?.status === 'pending' || a?.status === 'running' ? 5000 : false;
    },
  });

  const { data: issues = [] } = useQuery({
    queryKey: ['audit-issues', auditId, severityFilter, typeFilter],
    queryFn: () => apiFetch<AuditIssue[]>(`/audits/${auditId}/issues?${queryStr}`),
  });

  const retryMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/projects/${projectId}/audits`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits', projectId] });
      router.push(`/agency/projects/${projectId}/audits`);
    },
  });

  const sortedIssues = useMemo(() =>
    [...issues].sort((a, b) => {
      const sa = SEVERITY_ORDER[a.severity] ?? 99;
      const sb = SEVERITY_ORDER[b.severity] ?? 99;
      if (sa !== sb) return sa - sb;
      return a.url.localeCompare(b.url);
    }), [issues]);

  const paginatedIssues = sortedIssues.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(sortedIssues.length / PER_PAGE);

  if (!audit) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  if (audit.status === 'running' || audit.status === 'pending') {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-semibold">Audit en cours...</p>
        <p className="text-sm text-muted-foreground mt-1">Cela prend généralement quelques minutes</p>
      </div>
    );
  }

  if (audit.status === 'failed') {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-semibold text-destructive">Audit échoué</p>
        <p className="text-sm text-muted-foreground mt-1">Une erreur s&apos;est produite pendant l&apos;audit</p>
        <Button
          onClick={() => retryMutation.mutate()}
          className="mt-4"
        >
          Relancer l&apos;audit
        </Button>
      </div>
    );
  }

  const categories = audit.categoryScores || {};

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Résultats de l&apos;audit</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(audit.createdAt).toLocaleDateString('fr')} · {audit.pagesCrawled} pages explorées · {issues.length} problèmes
          </p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            if (!canExportPdf) return;
            setExporting(true);
            try {
              const res = await fetch(`${API_URL}/reports/audit/${auditId}/pdf`, { credentials: 'include' });
              if (!res.ok) return;
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `nexora-audit-${auditId}.pdf`;
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
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold">{audit.score ?? '-'}</div>
              <div className="text-sm text-muted-foreground mt-1">/ 100</div>
              <div className="text-xs font-medium mt-1">Score global</div>
            </div>
            <div className="flex-1 grid grid-cols-5 gap-4">
              {[
                { key: 'technical', label: 'Technique', max: 30 },
                { key: 'onpage', label: 'On-page', max: 25 },
                { key: 'performance', label: 'Performance', max: 20 },
                { key: 'crawlability', label: 'Crawlabilité', max: 15 },
                { key: 'content', label: 'Contenu', max: 10 },
              ].map(c => (
                <div key={c.key} className="text-center">
                  <div className="text-lg font-bold">{categories[c.key] ?? 0}</div>
                  <div className="text-xs text-muted-foreground">/ {c.max}</div>
                  <div className="text-xs font-medium mt-0.5">{c.label}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Problèmes</h2>
          <div className="flex gap-3">
            <Select
              value={severityFilter}
              onChange={e => { setSeverityFilter(e.target.value); setPage(0); }}
            >
              <option value="">Toutes sévérités</option>
              <option value="critical">Critique</option>
              <option value="high">Élevée</option>
              <option value="medium">Moyenne</option>
              <option value="low">Faible</option>
            </Select>
            <Select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setPage(0); }}
            >
              <option value="">Tous types</option>
              {[...new Set(issues.map(i => i.type))].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
        </div>

        {paginatedIssues.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Aucun problème trouvé</p>
        )}

        {paginatedIssues.length > 0 && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sévérité</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedIssues.map(issue => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <Badge variant={SEVERITY_BADGE_VARIANT[issue.severity] || 'secondary'}>
                        {issue.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs">{issue.url}</TableCell>
                    <TableCell className="text-xs">{issue.type}</TableCell>
                    <TableCell className="text-xs">{issue.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: totalPages }, (_, i) => (
              <Button
                key={i}
                variant={page === i ? 'default' : 'outline'}
                size="xs"
                onClick={() => setPage(i)}
              >
                {i + 1}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
