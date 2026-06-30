'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me-auth'] });
      queryClient.invalidateQueries({ queryKey: ['me-app'] });
      router.push('/agency/dashboard');
    },
    onError: (e: ApiError) => setError(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Connexion à Nexora</h1>
        <p className="text-sm text-muted-foreground mt-1">Entrez vos identifiants</p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>
      )}

      <div className="space-y-4">
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
            placeholder="••••••••"
          />
        </div>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="w-full"
        >
          {mutation.isPending ? 'Connexion en cours...' : 'Se connecter'}
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{' '}
        <Link href="/signup" className="text-brand font-medium hover:underline">S&apos;inscrire</Link>
      </p>
    </div>
  );
}
