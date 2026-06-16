'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

function Step1CreateProject({ onNext, onSkip, setProjectId }: { onNext: () => void; onSkip: () => void; setProjectId: (id: string) => void }) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [countryCode, setCountryCode] = useState('FR');
  const [languageCode, setLanguageCode] = useState('fr');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: () => apiFetch<{ id: string }>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, domain, countryCode, languageCode }),
    }),
    onSuccess: (data) => {
      setProjectId(data.id);
      onNext();
    },
    onError: (e: ApiError) => setError(e.message),
  });

  const validDomain = domain.includes('.') && domain.length > 3;

  return (
    <div className="space-y-4">
      <CardTitle>Créez votre premier projet</CardTitle>
      <CardDescription>Entrez les détails de votre site pour commencer.</CardDescription>
      {error && <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>}
      <div>
        <label className="block text-sm font-medium mb-1.5">Nom du projet</label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Mon site web" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Domaine</label>
        <Input value={domain} onChange={e => setDomain(e.target.value)} placeholder="example.com" />
        {domain && !validDomain && <p className="text-xs text-destructive mt-1">Entrez un domaine valide (ex. exemple.com)</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Pays</label>
        <Select value={countryCode} onChange={e => setCountryCode(e.target.value)}>
          <option value="FR">France</option>
          <option value="US">États-Unis</option><option value="GB">Royaume-Uni</option><option value="DE">Allemagne</option>
          <option value="ES">Espagne</option><option value="IT">Italie</option><option value="CA">Canada</option>
        </Select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Langue</label>
        <Select value={languageCode} onChange={e => setLanguageCode(e.target.value)}>
          <option value="fr">Français</option><option value="en">Anglais</option><option value="de">Allemand</option>
          <option value="es">Espagnol</option><option value="it">Italien</option>
        </Select>
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!name || !validDomain || createMutation.isPending}
        >
          {createMutation.isPending ? 'Création...' : 'Continuer'}
        </Button>
        <Button variant="ghost" onClick={onSkip}>Passer</Button>
      </div>
    </div>
  );
}

function Step2AddKeywords({ projectId, onNext, onSkip }: { projectId: string; onNext: () => void; onSkip: () => void }) {
  const [keywordsText, setKeywordsText] = useState('');
  const [country, setCountry] = useState('FR');
  const [language, setLanguage] = useState('fr');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const keywords = keywordsText.split('\n').map(k => k.trim()).filter(Boolean);
  const maxKeywords = 5;

  const addMutation = useMutation({
    mutationFn: async () => {
      const batch = keywords.slice(0, maxKeywords);
      for (let i = 0; i < batch.length; i++) {
        await apiFetch(`/projects/${projectId}/keywords`, {
          method: 'POST',
          body: JSON.stringify({ keyword: batch[i], countryCode: country, languageCode: language, device: 'desktop' }),
        });
        setProgress(i + 1);
      }
    },
    onSuccess: () => onNext(),
    onError: (e: ApiError) => setError(e.message),
  });

  return (
    <div className="space-y-4">
      <CardTitle>Ajoutez des mots-clés à suivre</CardTitle>
      <CardDescription>Entrez un mot-clé par ligne. Offre gratuite : jusqu&apos;à 5 mots-clés.</CardDescription>
      {error && <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>}
      <textarea
        value={keywordsText}
        onChange={e => setKeywordsText(e.target.value)}
        className="flex h-32 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs transition-all duration-200 focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20"
        placeholder="référencement naturel&#10;recherche de mots-clés&#10;suivi de positions"
      />
      <p className="text-xs text-muted-foreground">{keywords.length} mot(s)-clé(s) saisi(s)</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">Pays</label>
          <Select value={country} onChange={e => setCountry(e.target.value)}>
            <option value="FR">France</option><option value="US">États-Unis</option><option value="GB">Royaume-Uni</option>
            <option value="DE">Allemagne</option><option value="ES">Espagne</option><option value="IT">Italie</option><option value="CA">Canada</option>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Langue</label>
          <Select value={language} onChange={e => setLanguage(e.target.value)}>
            <option value="fr">Français</option><option value="en">Anglais</option><option value="de">Allemand</option>
            <option value="es">Espagnol</option><option value="it">Italien</option>
          </Select>
        </div>
      </div>
      {addMutation.isPending && <div className="text-sm text-muted-foreground">Ajout {progress}/{Math.min(keywords.length, maxKeywords)}...</div>}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={() => addMutation.mutate()}
          disabled={keywords.length === 0 || addMutation.isPending}
        >
          {addMutation.isPending ? 'Ajout...' : 'Continuer'}
        </Button>
        <Button variant="ghost" onClick={onSkip}>Passer</Button>
      </div>
    </div>
  );
}

function Step3LaunchAudit({ projectId }: { projectId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiFetch<{ domain: string }>(`/projects/${projectId}`),
  });

  const auditMutation = useMutation({
    mutationFn: () => apiFetch(`/projects/${projectId}/audits`, { method: 'POST' }),
    onSuccess: async () => {
      await apiFetch('/me/onboarding-complete', { method: 'PATCH' });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push(`/projects/${projectId}`);
    },
    onError: (e: ApiError) => setError(e.message),
  });

  const skipMutation = useMutation({
    mutationFn: () => apiFetch('/me/onboarding-complete', { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push('/dashboard');
    },
  });

  return (
    <div className="space-y-4">
      <CardTitle>Prêt à lancer !</CardTitle>
      <CardDescription>
        Cliquez ci-dessous pour lancer votre premier audit SEO sur <strong>{project?.domain || 'votre site'}</strong>.
      </CardDescription>
      {error && <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={() => auditMutation.mutate()}
          disabled={auditMutation.isPending}
        >
          {auditMutation.isPending ? 'Lancement...' : 'Lancer l\'audit'}
        </Button>
        <Button
          variant="ghost"
          onClick={() => skipMutation.mutate()}
          disabled={skipMutation.isPending}
        >
          Passer
        </Button>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [projectId, setProjectId] = useState('');

  const completeAndRedirect = async () => {
    await apiFetch('/me/onboarding-complete', { method: 'PATCH' });
    queryClient.invalidateQueries({ queryKey: ['me'] });
    router.push('/dashboard');
  };

  return (
    <div className="max-w-lg mx-auto py-16">
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${s <= step ? 'bg-brand text-white' : 'bg-muted text-muted-foreground'}`}>
            {s}
          </div>
        ))}
      </div>
      <Card className="border">
        <CardContent className="pt-6">
          {step === 1 && <Step1CreateProject onNext={() => setStep(2)} onSkip={completeAndRedirect} setProjectId={setProjectId} />}
          {step === 2 && projectId && <Step2AddKeywords projectId={projectId} onNext={() => setStep(3)} onSkip={completeAndRedirect} />}
          {step === 3 && projectId && <Step3LaunchAudit projectId={projectId} />}
        </CardContent>
      </Card>
    </div>
  );
}
