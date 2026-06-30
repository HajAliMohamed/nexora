'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import type { PlanLimits } from '@/lib/types/shared';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type UsageResponse = {
  plan: string;
  limits: PlanLimits;
  usage: { projects: number; keywords: number; auditsThisMonth: number; keywordSearchesToday: number; };
};

const PLAN_FEATURES: Record<string, { label: string; free: string; pro: string; agency: string }[]> = {
  general: [
    { label: 'Projets', free: '1', pro: '5', agency: '20' },
    { label: 'Mots-clés par projet', free: '20', pro: '500', agency: '5 000' },
    { label: 'Pages par audit', free: '100', pro: '500', agency: '2 000' },
    { label: 'Audits par mois', free: '1', pro: '10', agency: 'Illimité' },
    { label: 'Concurrents par projet', free: '1', pro: '5', agency: '10' },
    { label: 'Recherches / jour', free: '5', pro: '50', agency: '500' },
  ],
  data: [
    { label: 'Rétention historique', free: '30 jours', pro: '180 jours', agency: '730 jours' },
    { label: 'Export PDF', free: '✕', pro: '✓', agency: '✓' },
    { label: 'Marque blanche', free: '✕', pro: '✕', agency: '✓' },
  ],
};

function UsageBar({ current, max, label }: { current: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  const color = pct < 70 ? 'bg-success' : pct < 90 ? 'bg-warning' : 'bg-destructive';
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1"><span>{label}</span><span className="text-muted-foreground">{current}/{max}</span></div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export default function AgencyBillingPage() {
  const router = useRouter();
  const { data: usageData } = useQuery({
    queryKey: ['usage'],
    queryFn: () => apiFetch<UsageResponse>('/me/usage'),
    refetchInterval: (q: any) => { const d = q.state.data as UsageResponse | undefined; return d?.usage ? 30000 : false; },
  });

  const checkoutMutation = useMutation({
    mutationFn: (plan: string) => apiFetch<{ url: string }>('/billing/create-checkout-session', { method: 'POST', body: JSON.stringify({ plan }) }),
    onSuccess: (data) => { window.location.href = data.url; },
  });

  const portalMutation = useMutation({
    mutationFn: () => apiFetch<{ url: string }>('/billing/create-portal-session', { method: 'POST' }),
    onSuccess: (data) => { if (data.url) window.location.href = data.url; },
  });

  const usage = usageData?.usage;
  const limits = usageData?.limits;
  const currentPlan = usageData?.plan ?? 'free';

  return (
    <div className="space-y-8 max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight">Facturation et utilisation</h1>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Offre actuelle</CardTitle>
          <Badge variant={currentPlan === 'free' ? 'secondary' : currentPlan === 'pro' ? 'default' : 'success'}>{currentPlan === 'free' ? 'Gratuit' : currentPlan === 'pro' ? 'Pro' : 'Agence'}</Badge>
        </CardHeader>
        <CardContent>
          {usage && limits && (
            <div className="grid gap-4 sm:grid-cols-2 mb-4">
              <UsageBar current={usage.projects} max={limits.maxProjects} label="Projets" />
              <UsageBar current={usage.keywords} max={limits.maxKeywords} label="Mots-clés" />
              <UsageBar current={usage.auditsThisMonth} max={limits.maxAuditsPerMonth} label="Audits ce mois" />
              <UsageBar current={usage.keywordSearchesToday} max={limits.maxKeywordSearchesPerDay} label="Recherches aujourd'hui" />
            </div>
          )}
          {currentPlan !== 'free' && (<Button variant="outline" onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending}>Gérer la facturation</Button>)}
        </CardContent>
      </Card>

      <div>
        <h2 className="font-semibold mb-4">Offres</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {(['free', 'pro', 'agency'] as const).map(plan => {
            const isCurrent = currentPlan === plan;
            const price = plan === 'free' ? '0 €' : plan === 'pro' ? '39 €' : '99 €';
            return (
              <Card key={plan} className={`${isCurrent ? 'ring-2 ring-brand' : ''}`}>
                <CardHeader>
                  <CardTitle>{plan === 'free' ? 'Gratuit' : plan === 'pro' ? 'Pro' : 'Agence'}</CardTitle>
                  <p className="text-2xl font-bold mt-2">{price}<span className="text-sm font-normal text-muted-foreground">/mois</span></p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">{PLAN_FEATURES.general.map(f => (<li key={f.label} className="flex justify-between"><span className="text-muted-foreground">{f.label}</span><span className="font-medium">{f[plan]}</span></li>))}</ul>
                  <hr className="my-3" />
                  <ul className="space-y-2 text-sm">{PLAN_FEATURES.data.map(f => (<li key={f.label} className="flex justify-between"><span className="text-muted-foreground">{f.label}</span><span className="font-medium">{f[plan]}</span></li>))}</ul>
                </CardContent>
                <CardFooter>
                  {isCurrent ? (<Button disabled variant="outline" className="w-full opacity-50 cursor-not-allowed">Offre actuelle</Button>)
                  : plan === 'free' ? (<Button disabled variant="outline" className="w-full opacity-50 cursor-not-allowed">Rétrograder (contacter le support)</Button>)
                  : (<Button onClick={() => checkoutMutation.mutate(plan)} disabled={checkoutMutation.isPending} className="w-full">{checkoutMutation.isPending ? 'Redirection...' : `Passer à ${plan === 'pro' ? 'Pro' : 'Agence'}`}</Button>)}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
