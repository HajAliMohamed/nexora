'use client';

import { cn } from '@/lib/utils';

interface AiHeatmapItem {
  prompt: string;
  present: boolean;
  source: string;
}

interface AiHeatmapProps {
  data: AiHeatmapItem[];
}

export function AiHeatmap({ data }: AiHeatmapProps) {
  const columns = Math.min(data.length, 4);
  const rows: AiHeatmapItem[][] = [];
  for (let i = 0; i < data.length; i += columns) {
    rows.push(data.slice(i, i + columns));
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {rows.flat().map((item, i) => (
          <div
            key={i}
            className={cn(
              'relative rounded-lg border p-3 text-center transition-all hover:scale-105 cursor-default',
              item.present
                ? 'bg-success/10 border-success/30 text-success'
                : 'bg-destructive/5 border-destructive/20 text-muted-foreground',
            )}
          >
            <div className="text-xs font-medium truncate" title={item.prompt}>
              {item.prompt}
            </div>
            <div className={cn(
              'mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
              item.present
                ? 'bg-success/15 text-success'
                : 'bg-muted text-muted-foreground',
            )}>
              <span className={cn(
                'h-1.5 w-1.5 rounded-full',
                item.present ? 'bg-success' : 'bg-muted-foreground/50',
              )} />
              {item.present ? 'Présent' : 'Absent'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
