'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Agency, Project } from '@/lib/types/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Target, CalendarDays, TrendingUp, ListChecks } from 'lucide-react';

interface StrategyPhase {
  name: string;
  days: string;
  goal: string;
  actions: string[];
}

interface StrategyRoadmap {
  id: string;
  projectId: string;
  content: {
    summary: string;
    phases: StrategyPhase[];
    kpis: { metric: string; targetValue: number; timeframe: string }[];
    priorities: string[];
  };
  horizonDays: number;
  businessGoal: string;
  createdAt: string;
}

export default function AgencyStrategyPage() {
  const [selectedProject, setSelectedProject] = useState('');
  const [businessGoal, setBusinessGoal] = useState('traffic');

  const { data: agencies } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => apiFetch<Agency[]>('/agencies'),
  });

  const agency = agencies?.[0];

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiFetch<Project[]>('/projects'),
    enabled: !!agency,
  });

  const { data: existingStrategy, isLoading: strategyLoading } = useQuery({
    queryKey: ['strategy', selectedProject],
    queryFn: () => apiFetch<StrategyRoadmap | null>(`/projects/${selectedProject}/strategy`),
    enabled: !!selectedProject,
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      apiFetch<StrategyRoadmap>(`/projects/${selectedProject}/strategy/generate`, {
        method: 'POST',
        body: JSON.stringify({ businessGoal }),
      }),
  });

  const getGoalIcon = (goal: string) => {
    switch (goal) {
      case 'traffic': return <TrendingUp className="h-4 w-4" />;
      case 'leads': return <Target className="h-4 w-4" />;
      case 'authority': return <Sparkles className="h-4 w-4" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getGoalLabel = (goal: string) => {
    switch (goal) {
      case 'traffic': return 'Trafic';
      case 'leads': return 'Leads';
      case 'authority': return 'Autorité';
      default: return goal;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Strategy Engine</h1>
          <p className="text-sm text-muted-foreground">Stratégie SEO générée par IA</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={businessGoal}
            onChange={e => setBusinessGoal(e.target.value)}
            className="w-36"
          >
            <option value="traffic">Trafic</option>
            <option value="leads">Leads</option>
            <option value="authority">Autorité</option>
          </Select>
          <Select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="w-56"
          >
            <option value="">Sélectionnez un projet</option>
            {projects?.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!selectedProject || generateMutation.isPending}
          >
            {generateMutation.isPending ? 'Génération...' : 'Générer la stratégie'}
          </Button>
        </div>
      </div>

      {!selectedProject && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">Sélectionnez un projet pour générer ou voir sa stratégie SEO</p>
          </CardContent>
        </Card>
      )}

      {selectedProject && strategyLoading && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-48" />
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      )}

      {selectedProject && !strategyLoading && !existingStrategy && !generateMutation.isPending && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm font-medium mb-1">Aucune stratégie générée</p>
            <p className="text-xs text-muted-foreground mb-4">Cliquez sur &quot;Générer la stratégie&quot; pour créer une roadmap SEO personnalisée</p>
          </CardContent>
        </Card>
      )}

      {generateMutation.isPending && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="animate-pulse space-y-4">
              <Sparkles className="h-12 w-12 text-brand mx-auto animate-bounce" />
              <p className="text-sm font-medium">Génération de la stratégie SEO en cours...</p>
              <p className="text-xs text-muted-foreground">Analyse des données du projet et création de la roadmap</p>
            </div>
          </CardContent>
        </Card>
      )}

      {(existingStrategy || generateMutation.data) && (
        (() => {
          const strategy = existingStrategy || generateMutation.data;
          if (!strategy) return null;
          const content = strategy.content;
          return (
            <div className="space-y-6">
              {content.summary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-brand" />
                      Résumé de la stratégie
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{content.summary}</p>
                    <div className="flex gap-3 mt-4">
                      <Badge variant="outline" className="gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {strategy.horizonDays} jours
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        {getGoalIcon(strategy.businessGoal)}
                        {getGoalLabel(strategy.businessGoal)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {content.phases && content.phases.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-3">
                  {content.phases.map((phase, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{phase.name}</CardTitle>
                          <Badge variant="secondary">{phase.days}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground">{phase.goal}</p>
                        {phase.actions && phase.actions.length > 0 && (
                          <ul className="space-y-1.5">
                            {phase.actions.map((action, j) => (
                              <li key={j} className="text-xs flex items-start gap-2">
                                <span className="text-brand mt-0.5">•</span>
                                {action}
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {content.priorities && content.priorities.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <ListChecks className="h-4 w-4 text-brand" />
                      Actions prioritaires
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {content.priorities.map((p, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <Badge variant="outline" className="shrink-0 mt-0.5 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                            {i + 1}
                          </Badge>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {content.kpis && content.kpis.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-brand" />
                      Objectifs chiffrés (KPIs)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {content.kpis.map((kpi, i) => (
                        <div key={i} className="rounded-lg border p-3 text-center">
                          <p className="text-2xl font-bold text-brand">{kpi.targetValue}</p>
                          <p className="text-xs text-muted-foreground mt-1">{kpi.metric}</p>
                          <p className="text-xs text-muted-foreground">{kpi.timeframe}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          );
        })()
      )}
    </div>
  );
}
