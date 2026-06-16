'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import Link from 'next/link';

type BannerState = { show: boolean; resource: string };

const UpgradeBannerContext = createContext<{
  banner: BannerState;
  showUpgradeBanner: (resource: string) => void;
  dismissBanner: () => void;
}>({ banner: { show: false, resource: '' }, showUpgradeBanner: () => {}, dismissBanner: () => {} });

export function useUpgradeBanner() {
  return useContext(UpgradeBannerContext);
}

export function UpgradeBannerProvider({ children }: { children: React.ReactNode }) {
  const [banner, setBanner] = useState<BannerState>({ show: false, resource: '' });

  const showUpgradeBanner = useCallback((resource: string) => {
    setBanner({ show: true, resource });
  }, []);

  const dismissBanner = useCallback(() => {
    setBanner({ show: false, resource: '' });
  }, []);

  return (
    <UpgradeBannerContext.Provider value={{ banner, showUpgradeBanner, dismissBanner }}>
      {banner.show && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between gap-3">
          <p className="text-sm text-yellow-800">
            Vous avez atteint votre limite de {banner.resource}.{' '}
            <Link href="/billing" className="font-medium underline">Augmentez votre offre</Link> pour continuer.
          </p>
          <button onClick={dismissBanner} className="text-yellow-700 hover:text-yellow-900 text-sm font-medium">
            ✕
          </button>
        </div>
      )}
      {children}
    </UpgradeBannerContext.Provider>
  );
}
