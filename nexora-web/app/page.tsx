import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-full">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-bold text-xl">Nexora</h1>
          <div className="flex gap-4 items-center">
            <Link href="/login" className="text-sm font-medium hover:underline">
              Connexion
            </Link>
            <Link
              href="/signup"
              className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-4 py-24 text-center">
          <h2 className="text-5xl font-bold tracking-tight">
            L'analytique SEO pour<br />freelances &amp; petites agences
          </h2>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
            Suivez vos positions, auditez vos sites, recherchez des mots-clés et analysez vos concurrents
            — le tout dans une seule plateforme. Conçue pour le marché francophone.
          </p>
          <div className="mt-10 flex gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-black text-white px-6 py-3 rounded-md text-base font-medium hover:bg-gray-800"
            >
              Essai gratuit
            </Link>
            <Link
              href="/login"
              className="border px-6 py-3 rounded-md text-base font-medium hover:bg-gray-50"
            >
              Connexion
            </Link>
          </div>
        </section>

        <section className="border-t py-16">
          <div className="max-w-5xl mx-auto px-4 grid gap-8 sm:grid-cols-3">
            {[
              { title: 'Audit de site', desc: 'Analysez n\'importe quel domaine, détectez les problèmes et obtenez un rapport noté avec des correctifs.' },
              { title: 'Suivi de positions', desc: 'Suivez quotidiennement les positions de vos mots-clés, visualisez l\'historique et repérez les tendances.' },
              { title: 'Recherche de mots-clés', desc: 'Trouvez des mots-clés par volume, CPC et difficulté. Ajoutez-les à vos projets.' },
              { title: 'Analyse concurrentielle', desc: 'Comparez votre domaine à vos concurrents sur le chevauchement de mots-clés.' },
              { title: 'Alertes SEO', desc: 'Soyez notifié lorsque vos positions changent significativement.' },
              { title: 'Rapports PDF', desc: 'Exportez des rapports d\'audit et de positions professionnels pour vos clients.' },
            ].map(f => (
              <div key={f.title} className="border rounded-lg p-5">
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t py-16 text-center">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-3xl font-bold">Tarifs simples</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3 text-left">
              {[
                { name: 'Gratuit', price: '€0', projects: '1', keywords: '20', audits: '1/mois' },
                { name: 'Pro', price: '€39/mois', projects: '5', keywords: '500', audits: '10/mois' },
                { name: 'Agence', price: '€99/mois', projects: '20', keywords: '5 000', audits: 'Illimité' },
              ].map(p => (
                <div key={p.name} className="border rounded-lg p-6">
                  <h3 className="font-semibold text-lg">{p.name}</h3>
                  <p className="text-3xl font-bold mt-2">{p.price}</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li>{p.projects} projet{p.projects !== '1' ? 's' : ''}</li>
                    <li>{p.keywords} mot-clés</li>
                    <li>{p.audits}</li>
                  </ul>
                  <Link
                    href="/signup"
                    className="block mt-6 text-center bg-black text-white rounded-md py-2 text-sm font-medium hover:bg-gray-800"
                  >
                    Commencer
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Nexora. Tous droits réservés.
      </footer>
    </div>
  );
}
