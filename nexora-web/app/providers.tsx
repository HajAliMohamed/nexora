'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { UpgradeBannerProvider } from '@/components/upgrade-banner';
import { ApiError } from '@/lib/api';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <UpgradeBannerProvider>
        {children}
      </UpgradeBannerProvider>
    </QueryClientProvider>
  );
}
