'use client';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Une erreur inattendue s&apos;est produite. Veuillez réessayer.
        </p>
        <button onClick={reset} className="bg-black text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-gray-800">
          Réessayer
        </button>
      </div>
    </div>
  );
}