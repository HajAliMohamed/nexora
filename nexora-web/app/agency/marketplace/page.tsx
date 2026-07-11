'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Store, ShoppingCart, Puzzle, BookOpen, Wrench } from 'lucide-react';

const TYPE_ICONS: Record<string, any> = {
  module: Puzzle,
  connector: Wrench,
  template: BookOpen,
};

export default function AgencyMarketplacePage() {
  const [filterType, setFilterType] = useState('');
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['marketplace-items', filterType],
    queryFn: () => apiFetch<any[]>(`/marketplace/items${filterType ? `?type=${filterType}` : ''}`),
  });

  const { data: purchases } = useQuery({
    queryKey: ['marketplace-purchases'],
    queryFn: () => apiFetch<any[]>('/marketplace/purchases'),
  });

  const purchaseMutation = useMutation({
    mutationFn: (itemId: string) => apiFetch(`/marketplace/items/${itemId}/purchase`, { method: 'POST' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['marketplace-purchases'] }); },
  });

  const purchasedIds = new Set((purchases || []).map((p: any) => p.itemId));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marketplace V3</h1>
          <p className="text-sm text-muted-foreground">Extensions, connecteurs et templates</p>
        </div>
        <div className="flex gap-2">
          <Button variant={!filterType ? 'default' : 'outline'} size="sm" onClick={() => setFilterType('')}>Tout</Button>
          <Button variant={filterType === 'module' ? 'default' : 'outline'} size="sm" onClick={() => setFilterType('module')}>Modules</Button>
          <Button variant={filterType === 'connector' ? 'default' : 'outline'} size="sm" onClick={() => setFilterType('connector')}>Connecteurs</Button>
          <Button variant={filterType === 'template' ? 'default' : 'outline'} size="sm" onClick={() => setFilterType('template')}>Templates</Button>
        </div>
      </div>

      {isLoading && <Skeleton className="h-48" />}

      {items && items.length === 0 && (
        <Card><CardContent className="py-12 text-center"><Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-sm text-muted-foreground">Aucune extension disponible</p></CardContent></Card>
      )}

      {items && items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item: any) => {
            const Icon = TYPE_ICONS[item.type] || Puzzle;
            const owned = purchasedIds.has(item.id);
            return (
              <Card key={item.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-brand/10 p-2">
                      <Icon className="h-5 w-5 text-brand" />
                    </div>
                    <Badge variant="outline">{item.type}</Badge>
                  </div>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">{item.priceCents > 0 ? `${item.priceCents / 100}€` : 'Gratuit'}</p>
                    {owned ? (
                      <Badge variant="success">Installé</Badge>
                    ) : (
                      <Button size="sm" onClick={() => purchaseMutation.mutate(item.id)}>
                        <ShoppingCart className="h-4 w-4 mr-1" />Obtenir
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
