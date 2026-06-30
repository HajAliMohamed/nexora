'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import type { Agency, AgencyMember } from '@/lib/types/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  member: 'Membre',
};

const ROLE_VARIANTS: Record<string, 'default' | 'success' | 'secondary'> = {
  owner: 'default',
  admin: 'success',
  member: 'secondary',
};

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteError, setInviteError] = useState('');

  const { data: agencies, isLoading: agenciesLoading } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => apiFetch<Agency[]>('/agencies'),
  });

  const agency = agencies?.[0];

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['agency-team', agency?.id],
    queryFn: () => apiFetch<AgencyMember[]>(`/agencies/${agency!.id}/team`),
    enabled: !!agency,
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      apiFetch(`/agencies/${agency!.id}/team/invite`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      setInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
      setInviteError('');
      queryClient.invalidateQueries({ queryKey: ['agency-team', agency?.id] });
    },
    onError: (e: ApiError) => {
      setInviteError(e.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) =>
      apiFetch(`/agencies/${agency!.id}/team/${memberId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-team', agency?.id] });
    },
  });

  const isLoading = agenciesLoading || membersLoading;

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
          <h1 className="text-2xl font-bold tracking-tight">Équipe</h1>
          <p className="text-sm text-muted-foreground">Gérez les membres de votre agence</p>
        </div>
        <Button onClick={() => setInviteModal(true)}>
          Inviter un membre
        </Button>
      </div>

      <Card>
        <CardContent>
          {!members || members.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">Aucun membre dans l&apos;équipe</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Ajouté le</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map(member => (
                  <TableRow key={member.id}>
                    <TableCell className="text-sm font-medium">
                      {member.user?.name || '–'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {member.user?.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ROLE_VARIANTS[member.role] || 'secondary'}>
                        {ROLE_LABELS[member.role] || member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(member.createdAt).toLocaleDateString('fr')}
                    </TableCell>
                    <TableCell className="text-right">
                      {member.role !== 'owner' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeMutation.mutate(member.id)}
                          disabled={removeMutation.isPending}
                        >
                          Retirer
                        </Button>
                      )}
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
          <DialogTitle>Inviter un membre</DialogTitle>
          <DialogDescription>
            Le membre recevra une invitation par email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {inviteError && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{inviteError}</div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <Input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="membre@exemple.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Rôle</label>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as 'admin' | 'member')}
              className="flex h-9 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-all duration-200 focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20"
            >
              <option value="member">Membre</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setInviteModal(false); setInviteError(''); }}>
              Annuler
            </Button>
            <Button
              onClick={() => inviteMutation.mutate({ email: inviteEmail, role: inviteRole })}
              disabled={!inviteEmail || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? 'Envoi...' : 'Envoyer l\'invitation'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
