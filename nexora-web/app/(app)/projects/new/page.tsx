'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

const COUNTRIES = [
  { code: 'fr', label: 'France' },
  { code: 'be', label: 'Belgique' },
  { code: 'ch', label: 'Suisse' },
  { code: 'ca', label: 'Canada' },
];

const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'Anglais' },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [countryCode, setCountryCode] = useState('fr');
  const [languageCode, setLanguageCode] = useState('fr');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({ name, domain, countryCode, languageCode }),
      }),
    onSuccess: (data: any) => router.push(`/projects/${data.id}`),
    onError: (e: ApiError) => setError(e.message),
  });

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nouveau projet</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ajoutez un domaine à suivre
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Nom du projet</label>
          <Input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Mon site web"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Domaine</label>
          <Input
            type="text"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            placeholder="example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Pays</label>
          <Select
            value={countryCode}
            onChange={e => setCountryCode(e.target.value)}
          >
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Langue</label>
          <Select
            value={languageCode}
            onChange={e => setLanguageCode(e.target.value)}
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="flex-1"
          >
            <Button variant="outline" className="w-full">Annuler</Button>
          </Link>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex-1"
          >
            {mutation.isPending ? 'Création...' : 'Créer le projet'}
          </Button>
        </div>
      </div>
    </div>
  );
}
