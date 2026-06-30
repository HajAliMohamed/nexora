'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

export default function AgencySettingsPage() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<{ id: string; email: string; name?: string; onboardingComplete: boolean; createdAt: string }>('/me'),
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  if (user && !initialized) {
    setName(user.name || '');
    setEmail(user.email);
    setInitialized(true);
  }

  const profileMutation = useMutation({
    mutationFn: () => apiFetch('/me', { method: 'PATCH', body: JSON.stringify({ name, email }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['me'] }); setProfileSuccess(true); setProfileError(''); setTimeout(() => setProfileSuccess(false), 3000); },
    onError: (e: ApiError) => { setProfileError(e.message); setProfileSuccess(false); },
  });

  const passwordMutation = useMutation({
    mutationFn: () => apiFetch('/me/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
    onSuccess: () => { setCurrentPassword(''); setNewPassword(''); setPasswordSuccess(true); setPasswordError(''); setTimeout(() => setPasswordSuccess(false), 3000); },
    onError: (e: ApiError) => { setPasswordError(e.message); setPasswordSuccess(false); },
  });

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Paramètres</h1><p className="text-sm text-muted-foreground mt-1">Gérez votre profil et votre mot de passe</p></div>

      <Card>
        <CardHeader><CardTitle>Profil</CardTitle><CardDescription>Modifiez votre nom et votre adresse email</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {profileError && <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{profileError}</div>}
          {profileSuccess && <div className="bg-success/10 text-success text-sm rounded-md p-3">Profil mis à jour</div>}
          <div><label className="block text-sm font-medium mb-1.5">Nom</label><Input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Votre nom" /></div>
          <div><label className="block text-sm font-medium mb-1.5">Email</label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" /></div>
        </CardContent>
        <CardFooter><Button className="w-full" onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending}>{profileMutation.isPending ? 'Sauvegarde...' : 'Enregistrer'}</Button></CardFooter>
      </Card>

      <Card>
        <CardHeader><CardTitle>Mot de passe</CardTitle><CardDescription>Changez votre mot de passe</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {passwordError && <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{passwordError}</div>}
          {passwordSuccess && <div className="bg-success/10 text-success text-sm rounded-md p-3">Mot de passe mis à jour</div>}
          <div><label className="block text-sm font-medium mb-1.5">Mot de passe actuel</label><Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1.5">Nouveau mot de passe</label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
        </CardContent>
        <CardFooter><Button className="w-full" onClick={() => passwordMutation.mutate()} disabled={passwordMutation.isPending || !currentPassword || !newPassword}>{passwordMutation.isPending ? 'Sauvegarde...' : 'Mettre à jour le mot de passe'}</Button></CardFooter>
      </Card>

      <Card>
        <CardHeader><CardTitle>Compte</CardTitle><CardDescription>Informations sur votre compte</CardDescription></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{user.email}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Membre depuis</span><span className="font-medium">{new Date(user.createdAt).toLocaleDateString('fr')}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
