import type { PlanLimits } from './types/shared';

export type PlanId = 'free' | 'pro' | 'agency';

export type PlanInfo = {
  id: PlanId;
  name: string;
  price: string;
  features: string[];
};

export const PLANS: PlanInfo[] = [
  {
    id: 'free',
    name: 'Free',
    price: '0',
    features: ['1 projet', '20 mots-clés', '100 pages/audit', '1 audit/mois'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '39',
    features: ['5 projets', '500 mots-clés', '500 pages/audit', '10 audits/mois', 'Export PDF'],
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '99',
    features: ['20 projets', '5 000 mots-clés', '2 000 pages/audit', 'Audits illimités', 'Marque blanche'],
  },
];

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxProjects: 1, maxKeywords: 20, maxPagesPerAudit: 100,
    maxAuditsPerMonth: 1, maxCompetitorsPerProject: 1,
    maxKeywordSearchesPerDay: 5, historyDays: 30,
    pdfExport: false, whiteLabel: false,
  },
  pro: {
    maxProjects: 5, maxKeywords: 500, maxPagesPerAudit: 500,
    maxAuditsPerMonth: 10, maxCompetitorsPerProject: 5,
    maxKeywordSearchesPerDay: 50, historyDays: 180,
    pdfExport: true, whiteLabel: false,
  },
  agency: {
    maxProjects: 20, maxKeywords: 5000, maxPagesPerAudit: 2000,
    maxAuditsPerMonth: 9999, maxCompetitorsPerProject: 10,
    maxKeywordSearchesPerDay: 500, historyDays: 730,
    pdfExport: true, whiteLabel: true,
  },
};

export const PLAN_FEATURES: Record<string, { label: string; free: string; pro: string; agency: string }[]> = {
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

export function getPlanLabel(plan: string): string {
  const labels: Record<string, string> = { free: 'Gratuit', pro: 'Pro', agency: 'Agence' };
  return labels[plan] ?? plan;
}

export function getPlanPrice(plan: string): string {
  const prices: Record<string, string> = { free: '0 €', pro: '39 €', agency: '99 €' };
  return prices[plan] ?? '';
}
