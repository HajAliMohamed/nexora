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
import { FileText, Sparkles, Send } from 'lucide-react';

export default function AgencyContentPage() {
  const [selectedProject, setSelectedProject] = useState('');
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const queryClient = useQueryClient();

  const { data: agencies } = useQuery({ queryKey: ['agencies'], queryFn: () => apiFetch<Agency[]>('/agencies') });
  const agency = agencies?.[0];
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => apiFetch<Project[]>('/projects'), enabled: !!agency });

  const { data: articles } = useQuery({
    queryKey: ['content-articles', selectedProject],
    queryFn: () => apiFetch<any[]>(`/projects/${selectedProject}/content/articles`),
    enabled: !!selectedProject,
  });

  const generateMutation = useMutation({
    mutationFn: () => apiFetch(`/projects/${selectedProject}/content/briefs`, {
      method: 'POST',
      body: JSON.stringify({ topic, keywords: keywords.split(',').map(k => k.trim()) }),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['content-articles', selectedProject] }); setTopic(''); setKeywords(''); },
  });

  const articleMutation = useMutation({
    mutationFn: (briefId: string) => apiFetch(`/projects/${selectedProject}/content/articles/generate`, {
      method: 'POST',
      body: JSON.stringify({ briefId }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['content-articles', selectedProject] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Content Factory</h1>
          <p className="text-sm text-muted-foreground">Générez des articles optimisés SEO</p>
        </div>
        <Select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="w-48">
          <option value="">Projet...</option>
          {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      {selectedProject && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Sujet de l'article" />
            <Input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Mots-clés (séparés par des virgules)" />
            <Button onClick={() => generateMutation.mutate()} disabled={!topic || generateMutation.isPending}>
              <Sparkles className="h-4 w-4 mr-1" />Générer l'article
            </Button>
          </CardContent>
        </Card>
      )}

      {articles && articles.length === 0 && (
        <Card><CardContent className="py-12 text-center"><FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-sm text-muted-foreground">Aucun article généré</p></CardContent></Card>
      )}

      {articles && articles.length > 0 && (
        <div className="space-y-3">
          {articles.map((article: any) => (
            <Card key={article.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{article.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(article.createdAt).toLocaleDateString('fr')}</p>
                  </div>
                  <Badge variant={article.status === 'published' ? 'success' : 'secondary'}>{article.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
