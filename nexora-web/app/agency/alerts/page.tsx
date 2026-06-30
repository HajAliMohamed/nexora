'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { SeoAlert } from '@/lib/types/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'à l\'instant';
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hier';
  if (days < 30) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr');
}

function AlertCard({ alert, onMarkRead }: { alert: SeoAlert; onMarkRead: (id: string) => void }) {
  const isGain = alert.type === 'ranking_gain';
  const isDrop = alert.type === 'ranking_drop';
  const keyword = (alert.payload.keyword as string) || '';
  const from = alert.payload.from as number;
  const to = alert.payload.to as number;

  return (
    <Card className={`cursor-pointer transition-colors ${alert.readAt ? '' : 'border-brand/30 bg-brand/[0.02]'} hover:bg-muted/50`} onClick={() => !alert.readAt && onMarkRead(alert.id)}>
      <CardContent className="flex items-start gap-3 p-4">
        <span className="text-lg mt-0.5">{isGain ? '↑' : isDrop ? '↓' : '•'}</span>
        <div className="flex-1 min-w-0">
          {isGain && (<p className="text-sm">Le mot-clé <strong>"{keyword}"</strong> est passé de la position {from} à la position {to}<Badge variant="success" className="ml-1">+{from - to}</Badge></p>)}
          {isDrop && (<p className="text-sm">Le mot-clé <strong>"{keyword}"</strong> est tombé de la position {from} à la position {to}<Badge variant="destructive" className="ml-1">{to - from}</Badge></p>)}
          {!isGain && !isDrop && (<p className="text-sm">{JSON.stringify(alert.payload)}</p>)}
          <p className="text-xs text-muted-foreground mt-1">{timeAgo(alert.createdAt)}</p>
        </div>
        {!alert.readAt && <span className="w-2 h-2 rounded-full bg-brand mt-2 shrink-0" />}
      </CardContent>
    </Card>
  );
}

export default function AgencyAlertsPage() {
  const queryClient = useQueryClient();
  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => apiFetch<SeoAlert[]>('/alerts'),
    refetchInterval: (q: any) => { const data = q.state.data as SeoAlert[] | undefined; return data?.some(a => !a.readAt) ? 30000 : false; },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/alerts/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['alerts'] }); queryClient.invalidateQueries({ queryKey: ['alerts-unread'] }); },
  });

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Alertes</h1>
      {alerts.length === 0 && (
        <Card><CardContent className="text-center py-12"><p className="text-sm text-muted-foreground">Pas encore d&apos;alerte. Elles apparaîtront ici lorsque vos positions changeront significativement.</p></CardContent></Card>
      )}
      <div className="space-y-3">
        {alerts.map(alert => (<AlertCard key={alert.id} alert={alert} onMarkRead={(id) => markReadMutation.mutate(id)} />))}
      </div>
    </div>
  );
}
