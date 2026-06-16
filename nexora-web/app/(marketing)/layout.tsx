import Link from 'next/link';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-full">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg">Nexora</Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/#features" className="text-muted-foreground hover:text-foreground">Fonctionnalités</Link>
            <Link href="/#pricing" className="text-muted-foreground hover:text-foreground">Tarifs</Link>
            <Link href="/login" className="text-muted-foreground hover:text-foreground">Connexion</Link>
            <Link href="/signup" className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800">S&apos;inscrire</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-bold text-foreground">Nexora</span>
          <div className="flex gap-6">
            <Link href="/#features" className="hover:text-foreground">Fonctionnalités</Link>
            <Link href="/#pricing" className="hover:text-foreground">Tarifs</Link>
            <Link href="/login" className="hover:text-foreground">Connexion</Link>
            <Link href="/signup" className="hover:text-foreground">S&apos;inscrire</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}