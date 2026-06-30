'use client';

import { Suspense, useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function ClientLoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (searchParams.get('error') === 'expired') {
      setError('Votre lien de connexion a expiré. Demandez un nouveau lien.');
    }
  }, [searchParams]);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch('/auth/magic-link/send', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    onSuccess: () => {
      setSent(true);
    },
    onError: (e: ApiError) => setError(e.message),
  });

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-brand/10 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vérifiez votre boîte email</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Nous avons envoyé un lien de connexion à <strong>{email}</strong>.
            <br />Cliquez sur le lien pour accéder à votre espace.
          </p>
        </div>
        <Button variant="outline" onClick={() => { setSent(false); setEmail(''); }}>
          Utiliser un autre email
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Espace client Nexora</h1>
        <p className="text-sm text-muted-foreground mt-1">Connectez-vous avec un lien magique</p>
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
        <Button
          onClick={() => mutation.mutate()}
          disabled={!email || mutation.isPending}
          className="w-full"
        >
          {mutation.isPending ? 'Envoi en cours...' : 'Recevoir le lien magique'}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Vous êtes une agence ?{' '}
        <Link href="/login" className="text-brand font-medium hover:underline">
          Connexion agence
        </Link>
      </p>
    </div>
  );
}

export default function ClientLoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">Chargement...</div>}>
      <ClientLoginForm />
    </Suspense>
  );
}
