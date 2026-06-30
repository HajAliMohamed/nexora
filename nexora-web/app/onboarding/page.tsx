'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

function Step1CreateAgency({ onNext }: { onNext: (agencyId: string) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: () => apiFetch<{ id: string }>('/agencies', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
    onSuccess: (data) => onNext(data.id),
    onError: (e: ApiError) => setError(e.message),
  });

  return (
    <div className="space-y-4">
      <CardTitle>Créez votre agence</CardTitle>
      <CardDescription>Donnez un nom à votre agence pour commencer.</CardDescription>
      {error && <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>}
      <div>
        <label className="block text-sm font-medium mb-1.5">Nom de l&apos;agence</label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Mon Agence SEO" />
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={() => createMutation.mutate()} disabled={!name || createMutation.isPending}>
          {createMutation.isPending ? 'Création...' : 'Continuer'}
        </Button>
      </div>
    </div>
  );
}

function Step2ChoosePlan({ onNext }: { onNext: () => void }) {
  const [loading, setLoading] = useState('');

  const plans = [
    { id: 'free', name: 'Free', price: '0', features: ['1 projet', '20 mots-clés', '100 pages/audit', '1 audit/mois'] },
    { id: 'pro', name: 'Pro', price: '39', features: ['5 projets', '500 mots-clés', '500 pages/audit', '10 audits/mois', 'Export PDF'] },
    { id: 'agency', name: 'Agency', price: '99', features: ['20 projets', '5 000 mots-clés', '2 000 pages/audit', 'Audits illimités', 'Marque blanche'] },
  ];

  const selectPlan = async (planId: string) => {
    if (planId === 'free') { onNext(); return; }
    setLoading(planId);
    try {
      const data = await apiFetch<{ url: string }>('/billing/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ plan: planId, success_url: `${window.location.origin}/onboarding?step=3` }),
      });
      window.location.href = data.url;
    } catch { setLoading(''); }
  };

  return (
    <div className="space-y-4">
      <CardTitle>Choisissez votre offre</CardTitle>
      <CardDescription>Commencez gratuitement ou passez à une offre supérieure à tout moment.</CardDescription>
      <div className="grid gap-3 sm:grid-cols-3">
        {plans.map(plan => (
          <Card key={plan.id} className={`border-2 ${plan.id === 'free' ? 'border-muted' : 'border-brand/20'} hover:border-brand/50 transition-colors`}>
            <CardContent className="pt-6 text-center">
              <h3 className="font-bold text-lg">{plan.name}</h3>
              <p className="text-2xl font-bold mt-1">{plan.price}<span className="text-sm font-normal text-muted-foreground">€/mois</span></p>
              <ul className="mt-4 space-y-1.5 text-xs text-left">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success shrink-0" />{f}</li>
                ))}
              </ul>
              <Button
                className="mt-4 w-full"
                variant={plan.id === 'free' ? 'outline' : 'default'}
                onClick={() => selectPlan(plan.id)}
                disabled={loading !== ''}
              >
                {loading === plan.id ? 'Redirection...' : plan.id === 'free' ? 'Continuer gratuitement' : 'Choisir'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Step3CreateProject({ onNext, onSkip, setProjectId }: { onNext: () => void; onSkip: () => void; setProjectId: (id: string) => void }) {
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
    onSuccess: (data) => { setProjectId(data.id); onNext(); },
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
        <Button onClick={() => createMutation.mutate()} disabled={!name || !validDomain || createMutation.isPending}>
          {createMutation.isPending ? 'Création...' : 'Continuer'}
        </Button>
        <Button variant="ghost" onClick={onSkip}>Passer</Button>
      </div>
    </div>
  );
}

function Step4AddKeywords({ projectId, onNext, onSkip }: { projectId: string; onNext: () => void; onSkip: () => void }) {
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
        <Button onClick={() => addMutation.mutate()} disabled={keywords.length === 0 || addMutation.isPending}>
          {addMutation.isPending ? 'Ajout...' : 'Continuer'}
        </Button>
        <Button variant="ghost" onClick={onSkip}>Passer</Button>
      </div>
    </div>
  );
}

function Step5LaunchAudit({ projectId }: { projectId: string }) {
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
      router.push(`/agency/projects/${projectId}`);
    },
    onError: (e: ApiError) => setError(e.message),
  });

  const skipMutation = useMutation({
    mutationFn: () => apiFetch('/me/onboarding-complete', { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push('/agency/dashboard');
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
        <Button onClick={() => auditMutation.mutate()} disabled={auditMutation.isPending}>
          {auditMutation.isPending ? 'Lancement...' : "Lancer l'audit"}
        </Button>
        <Button variant="ghost" onClick={() => skipMutation.mutate()} disabled={skipMutation.isPending}>
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
  const [agencyId, setAgencyId] = useState('');
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stepParam = params.get('step');
    if (stepParam) setStep(Number(stepParam));
  }, []);

  const completeAndRedirect = async () => {
    await apiFetch('/me/onboarding-complete', { method: 'PATCH' });
    queryClient.invalidateQueries({ queryKey: ['me'] });
    router.push('/agency/dashboard');
  };

  return (
    <div className="max-w-3xl mx-auto py-16">
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${s <= step ? 'bg-brand text-white' : 'bg-muted text-muted-foreground'}`}>
            {s}
          </div>
        ))}
      </div>
      <Card className="border">
        <CardContent className="pt-6">
          {step === 1 && <Step1CreateAgency onNext={(id) => { setAgencyId(id); setStep(2); }} />}
          {step === 2 && <Step2ChoosePlan onNext={() => setStep(3)} />}
          {step === 3 && <Step3CreateProject onNext={() => setStep(4)} onSkip={completeAndRedirect} setProjectId={setProjectId} />}
          {step === 4 && projectId && <Step4AddKeywords projectId={projectId} onNext={() => setStep(5)} onSkip={completeAndRedirect} />}
          {step === 5 && projectId && <Step5LaunchAudit projectId={projectId} />}
        </CardContent>
      </Card>
    </div>
  );
}
