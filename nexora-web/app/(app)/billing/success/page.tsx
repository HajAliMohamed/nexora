'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BillingSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push('/dashboard'), 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="text-center py-20">
      <h1 className="text-2xl font-bold tracking-tight">Offre mise à jour !</h1>
      <p className="text-muted-foreground mt-2">
        Votre offre a été mise à jour. Profitez de vos nouvelles limites.
      </p>
      <p className="text-xs text-muted-foreground mt-4">Redirection vers le tableau de bord...</p>
    </div>
  );
}
