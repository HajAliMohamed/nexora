'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, TrendingUp, AlertTriangle, Target } from 'lucide-react';

interface NarrativeBlockProps {
  scoreGlobal?: number | null;
  issuesCount?: number;
  pagesCrawled?: number;
  aiVisibility?: number;
  growthPotential?: number;
  topOpportunities?: string[];
}

export function NarrativeBlock({
  scoreGlobal,
  issuesCount,
  pagesCrawled,
  aiVisibility,
  growthPotential,
  topOpportunities,
}: NarrativeBlockProps) {
  const segments: string[] = [];

  if (scoreGlobal != null) {
    if (scoreGlobal >= 80) segments.push('Le site affiche une bonne santé SEO globale.');
    else if (scoreGlobal >= 50) segments.push('Le site a un potentiel SEO moyen, des améliorations sont possibles.');
    else segments.push('Le site nécessite des optimisations SEO importantes.');
  }

  if (issuesCount != null && pagesCrawled != null) {
    const ratio = pagesCrawled > 0 ? Math.round((issuesCount / pagesCrawled) * 100) : 0;
    if (ratio > 50) segments.push(`Une forte densité de problèmes techniques a été détectée (${ratio}% des pages).`);
    else if (ratio > 20) segments.push(`${issuesCount} problèmes ont été identifiés sur ${pagesCrawled} pages analysées.`);
    else segments.push(`Peu de problèmes détectés : ${issuesCount} sur ${pagesCrawled} pages.`);
  }

  if (aiVisibility != null) {
    if (aiVisibility >= 50) segments.push('Une bonne visibilité dans les résultats de recherche IA.');
    else if (aiVisibility > 0) segments.push('La visibilité IA est encore faible, des opportunités existent.');
    else segments.push('Aucune visibilité IA détectée pour le moment.');
  }

  if (growthPotential != null) {
    if (growthPotential >= 50) segments.push('Un fort potentiel de croissance a été identifié.');
    else if (growthPotential > 0) segments.push('Le potentiel de croissance est modéré.');
  }

  const narrative = segments.join(' ');

  const actions: { icon: any; label: string; variant: 'default' | 'success' | 'warning' | 'destructive' }[] = [];
  if (scoreGlobal != null && scoreGlobal < 50) {
    actions.push({ icon: AlertTriangle, label: 'Corriger les erreurs techniques prioritaires', variant: 'destructive' });
  }
  if (aiVisibility != null && aiVisibility < 30) {
    actions.push({ icon: Target, label: 'Améliorer la visibilité IA', variant: 'warning' });
  }
  if (growthPotential != null && growthPotential > 0) {
    actions.push({ icon: TrendingUp, label: 'Exploiter le potentiel de croissance', variant: 'success' });
  }
  if (topOpportunities && topOpportunities.length > 0) {
    actions.push({ icon: Lightbulb, label: `Travailler : ${topOpportunities[0]}`, variant: 'default' });
  }

  if (!narrative && actions.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Résumé narratif</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{narrative || 'Analyse non disponible.'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {actions.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-brand mt-0.5 shrink-0" />
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium">Actions recommandées</p>
                <div className="space-y-1.5">
                  {actions.map((action, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Badge variant={action.variant === 'default' ? 'outline' : action.variant} className="shrink-0">
                        <action.icon className="h-3 w-3 mr-1" />
                        {action.label}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
