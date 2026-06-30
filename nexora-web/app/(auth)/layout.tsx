'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data, isSuccess } = useQuery({
    queryKey: ['me-auth'],
    queryFn: () => apiFetch<{ id: string }>('/me'),
    retry: false,
  });

  useEffect(() => {
    if (isSuccess && data) {
      router.replace('/agency/dashboard');
    }
  }, [isSuccess, data, router]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-sm px-4">{children}</div>
    </div>
  );
}
