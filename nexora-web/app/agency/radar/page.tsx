'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Agency, Project, CompetitorRadar } from '@/lib/types/shared';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Crosshair, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export default function AgencyRadarPage() {
  const [selectedProject, setSelectedProject] = useState('');

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

  const { data: radar, isLoading } = useQuery({
    queryKey: ['competitor-radar', selectedProject],
    queryFn: () => apiFetch<CompetitorRadar>(`/projects/${selectedProject}/competitors/radar`),
    enabled: !!selectedProject,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Competitor Radar</h1>
          <p className="text-sm text-muted-foreground">Surveillance des mouvements concurrentiels</p>
        </div>
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
      </div>

      {!selectedProject && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Crosshair className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">Sélectionnez un projet pour voir les mouvements concurrentiels</p>
          </CardContent>
        </Card>
      )}

      {selectedProject && isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-48" />
        </div>
      )}

      {selectedProject && !isLoading && radar && (
        <>
          {radar.competitorMovements.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {radar.competitorMovements.map((cm, i) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="text-sm truncate">{cm.domain}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1.5 text-success">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-lg font-bold">+{cm.gained}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-destructive">
                        <TrendingDown className="h-4 w-4" />
                        <span className="text-lg font-bold">{cm.lost}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      positions gagnées / perdues (7 jours)
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {radar.events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Événements récents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {radar.events.slice(0, 20).map((event, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                      <Badge variant={
                        event.type === 'competitor_top10' ? 'destructive' :
                        event.type === 'competitor_new_keyword' ? 'warning' : 'outline'
                      } className="shrink-0">
                        {event.type === 'competitor_top10' ? 'Top 10' :
                         event.type === 'competitor_new_keyword' ? 'Nouveau' : event.type}
                      </Badge>
                      <p className="text-sm">{event.detail}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {radar.events.length === 0 && radar.competitorMovements.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Crosshair className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm font-medium mb-1">Aucun mouvement détecté</p>
                <p className="text-xs text-muted-foreground">Ajoutez des concurrents et rafraîchissez les positions pour voir les mouvements</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
