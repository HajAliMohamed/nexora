'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import type { Agency, ClientUser } from '@/lib/types/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select';

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [assignModalClient, setAssignModalClient] = useState<ClientUser | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const { data: agencies, isLoading: agenciesLoading } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => apiFetch<Agency[]>('/agencies'),
  });

  const agency = agencies?.[0];

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['agency-clients', agency?.id],
    queryFn: () => apiFetch<ClientUser[]>(`/agencies/${agency!.id}/clients`),
    enabled: !!agency,
  });

  const { data: agencyProjects } = useQuery({
    queryKey: ['agency-projects', agency?.id],
    queryFn: () => apiFetch<{ id: string; name: string; domain: string; clientId: string | null }[]>(`/agencies/${agency!.id}/projects`),
    enabled: !!agency,
  });

  const inviteMutation = useMutation({
    mutationFn: (email: string) =>
      apiFetch(`/agencies/${agency!.id}/clients/invite`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    onSuccess: () => {
      setInviteModal(false);
      setInviteEmail('');
      setInviteError('');
      queryClient.invalidateQueries({ queryKey: ['agency-clients', agency?.id] });
    },
    onError: (e: ApiError) => {
      setInviteError(e.message);
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ clientId, projectId }: { clientId: string; projectId: string }) =>
      apiFetch(`/agencies/${agency!.id}/clients/${clientId}/projects/${projectId}/assign`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      setAssignModalClient(null);
      setSelectedProjectId('');
      queryClient.invalidateQueries({ queryKey: ['agency-projects', agency?.id] });
      setSuccessMessage('Projet assigné avec succès !');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (e: ApiError) => {
      setInviteError(e.message);
      setTimeout(() => setInviteError(''), 3000);
    },
  });

  const sendMagicLinkMutation = useMutation({
    mutationFn: (email: string) =>
      apiFetch('/auth/magic-link/send', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    onSuccess: () => {
      setSuccessMessage('Lien magique envoyé avec succès !');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: () => {
      setInviteError('Erreur lors de l\'envoi du lien magique');
      setTimeout(() => setInviteError(''), 3000);
    },
  });

  const isLoading = agenciesLoading || clientsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!agency) return null;

  const unassignedProjects = agencyProjects?.filter(p => !p.clientId) || [];

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="bg-green-50 text-green-700 text-sm rounded-md p-3">{successMessage}</div>
      )}
      {inviteError && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{inviteError}</div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">Gérez les clients de votre agence</p>
        </div>
        <Button onClick={() => setInviteModal(true)}>
          Inviter un client
        </Button>
      </div>

      <Card>
        <CardContent>
          {!clients || clients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground mb-2">Aucun client pour le moment</p>
              <Button variant="outline" onClick={() => setInviteModal(true)}>
                Inviter votre premier client
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Ajouté le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map(client => (
                  <TableRow key={client.id}>
                    <TableCell className="text-sm font-medium">
                      {client.name || '–'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {client.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.active ? 'success' : 'secondary'}>
                        {client.active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(client.createdAt).toLocaleDateString('fr')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setAssignModalClient(client); setSelectedProjectId(''); }}
                          disabled={unassignedProjects.length === 0}
                        >
                          Assigner un projet
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendMagicLinkMutation.mutate(client.email)}
                          disabled={sendMagicLinkMutation.isPending}
                        >
                          {sendMagicLinkMutation.isPending ? '...' : 'Renvoyer le lien'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteModal} onClose={() => { setInviteModal(false); setInviteError(''); }}>
        <DialogHeader>
          <DialogTitle>Inviter un client</DialogTitle>
          <DialogDescription>
            Le client recevra un email avec un lien de connexion magique.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email du client</label>
            <Input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="client@exemple.com"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setInviteModal(false); setInviteError(''); }}>
              Annuler
            </Button>
            <Button
              onClick={() => inviteMutation.mutate(inviteEmail)}
              disabled={!inviteEmail || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? 'Envoi...' : 'Envoyer l\'invitation'}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!assignModalClient} onClose={() => { setAssignModalClient(null); setSelectedProjectId(''); }}>
        <DialogHeader>
          <DialogTitle>Assigner un projet</DialogTitle>
          <DialogDescription>
            Choisissez un projet à assigner à {assignModalClient?.name || assignModalClient?.email}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Projet</label>
            <Select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
              <option value="" disabled>Sélectionner un projet</option>
              {unassignedProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.domain})</option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setAssignModalClient(null); setSelectedProjectId(''); }}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (assignModalClient && selectedProjectId) {
                  assignMutation.mutate({ clientId: assignModalClient.id, projectId: selectedProjectId });
                }
              }}
              disabled={!selectedProjectId || assignMutation.isPending}
            >
              {assignMutation.isPending ? 'Assignation...' : 'Assigner'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
