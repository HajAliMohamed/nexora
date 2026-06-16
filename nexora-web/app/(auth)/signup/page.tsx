'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, name: name || undefined }),
      }),
    onSuccess: () => router.push('/dashboard'),
    onError: (e: ApiError) => setError(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Créez votre compte</h1>
        <p className="text-sm text-muted-foreground mt-1">Commencez votre aventure SEO</p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Nom</label>
          <Input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Votre nom"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Email</label>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Mot de passe</label>
          <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Au moins 8 caractères"
          />
        </div>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="w-full"
        >
          {mutation.isPending ? 'Création en cours...' : 'Créer mon compte'}
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Déjà un compte ?{' '}
        <Link href="/login" className="text-brand font-medium hover:underline">Se connecter</Link>
      </p>
    </div>
  );
}
