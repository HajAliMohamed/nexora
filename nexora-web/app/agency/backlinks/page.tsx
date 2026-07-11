'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Agency, Project } from '@/lib/types/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Link, Search, Send, Sparkles } from 'lucide-react';

export default function AgencyBacklinksPage() {
  const [selectedProject, setSelectedProject] = useState('');
  const [domain, setDomain] = useState('');
  const queryClient = useQueryClient();

  const { data: agencies } = useQuery({ queryKey: ['agencies'], queryFn: () => apiFetch<Agency[]>('/agencies') });
  const agency = agencies?.[0];
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => apiFetch<Project[]>('/projects'), enabled: !!agency });

  const { data: opportunities } = useQuery({
    queryKey: ['backlink-opps', selectedProject],
    queryFn: () => apiFetch<any[]>(`/projects/${selectedProject}/backlinks/opportunities`),
    enabled: !!selectedProject,
  });

  const { data: outreach } = useQuery({
    queryKey: ['backlink-outreach', selectedProject],
    queryFn: () => apiFetch<any[]>(`/projects/${selectedProject}/backlinks/outreach`),
    enabled: !!selectedProject,
  });

  const findMutation = useMutation({
    mutationFn: () => apiFetch(`/projects/${selectedProject}/backlinks/opportunities`, {
      method: 'POST', body: JSON.stringify({ domain }),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['backlink-opps', selectedProject] }); },
  });

  const outreachMutation = useMutation({
    mutationFn: (opportunityId: string) => apiFetch(`/projects/${selectedProject}/backlinks/outreach/generate`, {
      method: 'POST', body: JSON.stringify({ opportunityId }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['backlink-outreach', selectedProject] }),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/projects/${selectedProject}/backlinks/outreach/${id}/send`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['backlink-outreach', selectedProject] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Backlink Builder</h1>
          <p className="text-sm text-muted-foreground">Détection d'opportunités et outreach automatisé</p>
        </div>
        <Select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="w-48">
          <option value="">Projet...</option>
          {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      {selectedProject && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input value={domain} onChange={e => setDomain(e.target.value)} placeholder="Domaine cible (ex: exemple.com)" />
            <Button onClick={() => findMutation.mutate()} disabled={!domain || findMutation.isPending}>
              <Search className="h-4 w-4 mr-1" />Trouver des opportunités
            </Button>
          </CardContent>
        </Card>
      )}

      {opportunities && opportunities.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Opportunités ({opportunities.length})</h2>
          {opportunities.map((opp: any) => (
            <Card key={opp.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{opp.sourceDomain}</p>
                  <p className="text-xs text-muted-foreground">Autorité: {opp.authority} | Probabilité: {opp.probabilityScore}%</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => outreachMutation.mutate(opp.id)}>
                  <Sparkles className="h-4 w-4 mr-1" />Générer email
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {outreach && outreach.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Outreach ({outreach.length})</h2>
          {outreach.map((o: any) => (
            <Card key={o.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{o.recipientEmail}</p>
                    <p className="text-xs text-muted-foreground">{o.status}</p>
                  </div>
                  {o.status === 'draft' && <Button size="sm" onClick={() => sendMutation.mutate(o.id)}><Send className="h-4 w-4 mr-1" />Envoyer</Button>}
                  {o.status !== 'draft' && <Badge variant="success">Envoyé</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
