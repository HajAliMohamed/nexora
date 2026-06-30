'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import type { Agency, Project } from '@/lib/types/shared';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProjectsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createModal, setCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [error, setError] = useState('');

  const { data: agencies, isLoading: agenciesLoading } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => apiFetch<Agency[]>('/agencies'),
  });

  const agency = agencies?.[0];

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['agency-projects', agency?.id],
    queryFn: () => apiFetch<Project[]>(`/agencies/${agency!.id}/projects`),
    enabled: !!agency,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; domain: string }) =>
      apiFetch<Project>(`/agencies/${agency!.id}/projects`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-projects', agency?.id] });
      setCreateModal(false);
      setName('');
      setDomain('');
      setError('');
    },
    onError: (e: ApiError) => setError(e.message),
  });

  const isLoading = agenciesLoading || projectsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!agency) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projets</h1>
          <p className="text-sm text-muted-foreground">Gérez les projets de votre agence</p>
        </div>
        <Button onClick={() => setCreateModal(true)}>Nouveau projet</Button>
      </div>

      <Card>
        <CardContent>
          {!projects || projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground mb-2">Aucun projet pour le moment</p>
              <Button variant="outline" onClick={() => setCreateModal(true)}>
                Créer votre premier projet
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Domaine</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map(project => (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/agency/projects/${project.id}`)}
                  >
                    <TableCell className="text-sm font-medium">{project.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{project.domain}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(project.createdAt).toLocaleDateString('fr')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/agency/projects/${project.id}`); }}>
                        Voir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createModal} onClose={() => { setCreateModal(false); setError(''); }}>
        <DialogHeader>
          <DialogTitle>Nouveau projet</DialogTitle>
          <DialogDescription>Ajoutez un projet à votre agence</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5">Nom du projet</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Site client XYZ"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Domaine</label>
            <Input
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="exemple.com"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setCreateModal(false); setError(''); }}>
              Annuler
            </Button>
            <Button
              onClick={() => name.trim() && domain.trim() && createMutation.mutate({ name: name.trim(), domain: domain.trim() })}
              disabled={!name.trim() || !domain.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Création...' : 'Créer'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
