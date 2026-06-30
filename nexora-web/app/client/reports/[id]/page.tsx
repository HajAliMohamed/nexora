'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Lightbulb, Sparkles, TrendingUp, ShieldCheck, AlertTriangle, Ban, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export default function ClientReportDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['shared-report', token],
    queryFn: () => {
      if (!token) throw new Error('Missing share token');
      return fetch(`${API_URL}/reports/shared/${token}`).then(r => {
        if (!r.ok) throw new Error('Report not found');
        return r.json();
      });
    },
    enabled: !!token,
  });

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Ban className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">Lien invalide</h1>
        <p className="text-sm text-muted-foreground">Aucun token de partage fourni.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-bold">Rapport introuvable</h1>
        <p className="text-sm text-muted-foreground">Ce lien est peut-être expiré ou invalide.</p>
        <Link href="/client/login" className="text-sm text-brand hover:underline font-medium">
          Accéder à mon espace client
        </Link>
      </div>
    );
  }

  const scoreBadge = (score: number | null) => {
    if (score == null) return <Badge variant="outline" className="text-xl px-3 py-1">–</Badge>;
    if (score >= 80) return <Badge variant="success" className="text-xl px-3 py-1">{score}</Badge>;
    if (score >= 50) return <Badge variant="warning" className="text-xl px-3 py-1">{score}</Badge>;
    return <Badge variant="destructive" className="text-xl px-3 py-1">{score}</Badge>;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rapport SEO + IA Search</h1>
          <p className="text-sm text-muted-foreground">
            {report.periodType === 'monthly' ? 'Mensuel' : report.periodType === 'weekly' ? 'Hebdomadaire' : 'Trimestriel'} —
            {new Date(report.createdAt).toLocaleDateString('fr')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => window.open(`${API_URL}/reports/shared/${token}/pdf`, '_blank')}
          >
            <FileText className="h-4 w-4" />
            Télécharger PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> SEO Health
            </p>
            <div className="text-3xl font-bold">
              {scoreBadge(report.seoScore)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">/ 100</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> AI Visibility
            </p>
            <div className="text-3xl font-bold">
              {scoreBadge(report.aiScore)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">/ 100</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Growth Potential
            </p>
            <div className="text-3xl font-bold">
              {scoreBadge(report.growthScore)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">/ 100</p>
          </CardContent>
        </Card>
      </div>

      {report.narrative && (
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">Résumé narratif</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{report.narrative}</p>
          </CardContent>
        </Card>
      )}

      {report.recommendations?.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <FileText className="h-5 w-5 text-brand" />
            <CardTitle className="text-base">Actions prioritaires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.recommendations.map((rec: any, i: number) => (
                <div key={i} className="flex items-start gap-3 rounded-md border border-border p-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{rec.title || rec.action}</p>
                    {rec.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Rapport généré par <span className="text-brand font-medium">Nexora</span>
        </p>
      </div>
    </div>
  );
}
