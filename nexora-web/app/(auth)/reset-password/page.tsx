'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    onSuccess: () => setSent(true),
    onError: (e: ApiError) => setError(e.message),
  });

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Vérifiez vos emails</h1>
        <p className="text-sm text-muted-foreground">
          Si un compte existe avec cet email, nous avons envoyé un lien de réinitialisation.
        </p>
        <Link href="/login" className="text-sm text-brand font-medium hover:underline">Retour à la connexion</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Réinitialiser le mot de passe</h1>
        <p className="text-sm text-muted-foreground mt-1">Entrez votre adresse email</p>
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
          disabled={mutation.isPending}
          className="w-full"
        >
          {mutation.isPending ? 'Envoi en cours...' : 'Envoyer le lien'}
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-brand font-medium hover:underline">Retour à la connexion</Link>
      </p>
    </div>
  );
}
