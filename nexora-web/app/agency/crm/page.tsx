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
import { CheckSquare, Plus, ListChecks } from 'lucide-react';

export default function AgencyCrmPage() {
  const [selectedProject, setSelectedProject] = useState('');
  const [title, setTitle] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const queryClient = useQueryClient();

  const { data: agencies } = useQuery({ queryKey: ['agencies'], queryFn: () => apiFetch<Agency[]>('/agencies') });
  const agency = agencies?.[0];
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => apiFetch<Project[]>('/projects'), enabled: !!agency });

  const { data: tasks } = useQuery({
    queryKey: ['crm-tasks', selectedProject, filterStatus],
    queryFn: () => apiFetch<any[]>(`/projects/${selectedProject}/crm/tasks${filterStatus ? `?status=${filterStatus}` : ''}`),
    enabled: !!selectedProject,
  });

  const createMutation = useMutation({
    mutationFn: () => apiFetch(`/projects/${selectedProject}/crm/tasks`, {
      method: 'POST', body: JSON.stringify({ title }),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['crm-tasks', selectedProject] }); setTitle(''); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiFetch(`/projects/${selectedProject}/crm/tasks/${id}/status`, {
      method: 'PATCH', body: JSON.stringify({ status }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-tasks', selectedProject] }),
  });

  const statusColor: Record<string, string> = { todo: 'secondary', in_progress: 'warning', done: 'success' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SEO CRM</h1>
          <p className="text-sm text-muted-foreground">Suivi des tâches et actions SEO</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-36">
            <option value="">Toutes</option>
            <option value="todo">À faire</option>
            <option value="in_progress">En cours</option>
            <option value="done">Terminé</option>
          </Select>
          <Select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="w-48">
            <option value="">Projet...</option>
            {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
      </div>

      {selectedProject && (
        <div className="flex gap-2">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nouvelle tâche..." className="flex-1" />
          <Button onClick={() => createMutation.mutate()} disabled={!title}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
        </div>
      )}

      {tasks && tasks.length === 0 && (
        <Card><CardContent className="py-12 text-center"><ListChecks className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-sm text-muted-foreground">Aucune tâche</p></CardContent></Card>
      )}

      {tasks && tasks.length > 0 && (
        <div className="space-y-2">
          {tasks.map((task: any) => (
            <Card key={task.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" className="p-0" onClick={() => statusMutation.mutate({ id: task.id, status: task.status === 'done' ? 'todo' : 'done' })}>
                    <CheckSquare className={`h-5 w-5 ${task.status === 'done' ? 'text-success' : 'text-muted-foreground'}`} />
                  </Button>
                  <div>
                    <p className={`text-sm ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(task.createdAt).toLocaleDateString('fr')}</p>
                  </div>
                </div>
                <Badge variant={(statusColor[task.status] || 'secondary') as any}>{task.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
