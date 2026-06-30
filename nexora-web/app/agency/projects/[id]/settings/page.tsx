'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import type { Project } from '@/lib/types/shared';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

export default function AgencyProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.id as string;

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiFetch<Project>(`/projects/${projectId}`),
  });

  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [languageCode, setLanguageCode] = useState('');
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);

  if (project && !initialized) {
    setName(project.name);
    setCountryCode(project.countryCode);
    setLanguageCode(project.languageCode);
    setInitialized(true);
  }

  const updateMutation = useMutation({
    mutationFn: () => apiFetch(`/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify({ name, countryCode, languageCode }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project', projectId] }); router.push(`/agency/projects/${projectId}`); },
    onError: (e: ApiError) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/projects/${projectId}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); router.push('/agency/projects'); },
    onError: (e: ApiError) => setError(e.message),
  });

  const [showDelete, setShowDelete] = useState(false);

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;
  if (!project) return <p className="text-sm text-muted-foreground">Projet introuvable</p>;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Paramètres du projet</h1><p className="text-sm text-muted-foreground mt-1">{project.domain}</p></div>
      {error && <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div><label className="block text-sm font-medium mb-1.5">Nom du projet</label><Input type="text" value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1.5">Pays</label><Input type="text" value={countryCode} onChange={e => setCountryCode(e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1.5">Langue</label><Input type="text" value={languageCode} onChange={e => setLanguageCode(e.target.value)} /></div>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => router.push(`/agency/projects/${projectId}`)}>Annuler</Button>
          <Button className="flex-1" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Sauvegarde...' : 'Enregistrer'}</Button>
        </CardFooter>
      </Card>
      <Card className="border-destructive/30">
        <CardHeader><CardTitle className="text-destructive">Zone dangereuse</CardTitle><CardDescription>La suppression d&apos;un projet est irréversible.</CardDescription></CardHeader>
        <CardContent>
          {!showDelete ? (<Button variant="destructive" onClick={() => setShowDelete(true)}>Supprimer le projet</Button>) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Êtes-vous sûr ?</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowDelete(false)}>Annuler</Button>
                <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? 'Suppression...' : 'Confirmer la suppression'}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
