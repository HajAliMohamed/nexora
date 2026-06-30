'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ScoreCardProps {
  title: string;
  value: number | null;
  trend?: number; // percentage change
  color?: string; // CSS color string or var
}

export function ScoreCard({ title, value, trend, color = 'var(--primary)' }: ScoreCardProps) {
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;

  return (
    <Card className="col-span-4 card-hover overflow-hidden relative">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: color }} />
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-4xl font-bold tracking-tight">
              {value !== null ? value : '–'}
              {value !== null && <span className="text-xl text-muted-foreground ml-1">/100</span>}
            </p>
          </div>
          
          <div 
            className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-sm"
            style={{ backgroundColor: color }}
          >
            {value !== null ? Math.round(value / 10) : '?'}
          </div>
        </div>

        {trend !== undefined && (
          <div className="mt-4 flex items-center gap-1.5 text-sm font-medium">
            <span className={`flex items-center gap-1 ${isPositive ? 'text-success' : isNegative ? 'text-destructive' : 'text-muted-foreground'}`}>
              {isPositive ? <TrendingUp size={16} /> : isNegative ? <TrendingDown size={16} /> : <Minus size={16} />}
              {trend > 0 ? '+' : ''}{trend}%
            </span>
            <span className="text-muted-foreground font-normal">depuis le mois dernier</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
