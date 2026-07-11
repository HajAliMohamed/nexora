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
import { Layout, Sparkles, Globe } from 'lucide-react';

export default function AgencyLandingPage() {
  const [selectedProject, setSelectedProject] = useState('');
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const queryClient = useQueryClient();

  const { data: agencies } = useQuery({ queryKey: ['agencies'], queryFn: () => apiFetch<Agency[]>('/agencies') });
  const agency = agencies?.[0];
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => apiFetch<Project[]>('/projects'), enabled: !!agency });

  const { data: landings } = useQuery({
    queryKey: ['landings', selectedProject],
    queryFn: () => apiFetch<any[]>(`/projects/${selectedProject}/landing`),
    enabled: !!selectedProject,
  });

  const generateMutation = useMutation({
    mutationFn: () => apiFetch(`/projects/${selectedProject}/landing/generate`, {
      method: 'POST',
      body: JSON.stringify({ topic, keywords: keywords.split(',').map(k => k.trim()) }),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['landings', selectedProject] }); setTopic(''); setKeywords(''); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Landing Page Generator</h1>
          <p className="text-sm text-muted-foreground">Créez des landing pages optimisées IA Search</p>
        </div>
        <Select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="w-48">
          <option value="">Projet...</option>
          {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      {selectedProject && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Sujet de la landing page" />
            <Input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Mots-clés (séparés par des virgules)" />
            <Button onClick={() => generateMutation.mutate()} disabled={!topic || generateMutation.isPending}>
              <Sparkles className="h-4 w-4 mr-1" />Générer la landing page
            </Button>
          </CardContent>
        </Card>
      )}

      {landings && landings.length === 0 && (
        <Card><CardContent className="py-12 text-center"><Layout className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-sm text-muted-foreground">Aucune landing page générée</p></CardContent></Card>
      )}

      {landings && landings.length > 0 && (
        <div className="space-y-3">
          {landings.map((lp: any) => (
            <Card key={lp.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{lp.title}</p>
                  <p className="text-xs text-muted-foreground">/{lp.slug}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={lp.status === 'published' ? 'success' : 'secondary'}>{lp.status}</Badge>
                  {lp.html && <Button variant="outline" size="sm" onClick={() => window.open('/api/view-landing/' + lp.id, '_blank')}><Globe className="h-4 w-4" /></Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
