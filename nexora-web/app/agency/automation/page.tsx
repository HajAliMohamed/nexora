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
import { Workflow, Play, Plus, Trash2 } from 'lucide-react';

interface AutomationRule {
  id: string; projectId: string; name: string;
  triggerType: string; triggerConfig: Record<string, unknown>;
  actionType: string; actionConfig: Record<string, unknown>;
  active: boolean; runCount: number; createdAt: string;
}

export default function AgencyAutomationPage() {
  const [selectedProject, setSelectedProject] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('ranking_drop');
  const [actionType, setActionType] = useState('create_task');
  const queryClient = useQueryClient();

  const { data: agencies } = useQuery({ queryKey: ['agencies'], queryFn: () => apiFetch<Agency[]>('/agencies') });
  const agency = agencies?.[0];
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => apiFetch<Project[]>('/projects'), enabled: !!agency });

  const { data: rules, isLoading } = useQuery({
    queryKey: ['automation-rules', selectedProject],
    queryFn: () => apiFetch<AutomationRule[]>(`/projects/${selectedProject}/automation/rules`),
    enabled: !!selectedProject,
  });

  const createMutation = useMutation({
    mutationFn: () => apiFetch(`/projects/${selectedProject}/automation/rules`, {
      method: 'POST',
      body: JSON.stringify({ name, triggerType, triggerConfig: {}, actionType, actionConfig: { title: name } }),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['automation-rules', selectedProject] }); setShowForm(false); setName(''); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/projects/${selectedProject}/automation/rules/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automation-rules', selectedProject] }),
  });

  const toggleMutation = useMutation({
    mutationFn: (rule: AutomationRule) => apiFetch(`/projects/${selectedProject}/automation/rules/${rule.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: !rule.active }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automation-rules', selectedProject] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SEO Automation Hub</h1>
          <p className="text-sm text-muted-foreground">Automatisez vos actions SEO</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="w-48">
            <option value="">Projet...</option>
            {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          {selectedProject && <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />Nouvelle règle</Button>}
        </div>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nom de la règle" />
            <div className="flex gap-2">
              <Select value={triggerType} onChange={e => setTriggerType(e.target.value)} className="flex-1">
                <option value="ranking_drop">Baisse de classement</option>
                <option value="ranking_gain">Gain de classement</option>
                <option value="audit_completed">Audit terminé</option>
                <option value="ai_search_loss">Perte visibilité IA</option>
              </Select>
              <Select value={actionType} onChange={e => setActionType(e.target.value)} className="flex-1">
                <option value="create_task">Créer une tâche</option>
                <option value="send_alert">Envoyer une alerte</option>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => createMutation.mutate()} disabled={!name || createMutation.isPending}>Créer</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedProject && isLoading && <Skeleton className="h-32" />}

      {selectedProject && !isLoading && rules && rules.length === 0 && (
        <Card><CardContent className="py-12 text-center"><Workflow className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-sm text-muted-foreground">Aucune règle d&apos;automatisation. Créez-en une pour commencer.</p></CardContent></Card>
      )}

      {rules && rules.length > 0 && (
        <div className="space-y-3">
          {rules.map(rule => (
            <Card key={rule.id} className={rule.active ? '' : 'opacity-50'}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{rule.name}</p>
                    <Badge variant={rule.active ? 'success' : 'secondary'}>{rule.active ? 'Actif' : 'Inactif'}</Badge>
                    <Badge variant="outline">{rule.runCount} exécutions</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Si {rule.triggerType} → {rule.actionType}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleMutation.mutate(rule)}>{rule.active ? 'Désactiver' : 'Activer'}</Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(rule.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
