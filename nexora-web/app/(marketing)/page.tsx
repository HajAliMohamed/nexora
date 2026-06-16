import Link from 'next/link';
import { Button } from '@/components/ui/button';

const FEATURES = [
  { title: 'Audits SEO', desc: 'Analysez jusqu\'à 2 000 pages avec une notation sur 5 catégories. Identifiez rapidement les problèmes critiques.' },
  { title: 'Suivi de positions', desc: 'Suivez les positions quotidiennes dans plus de 200 pays. Visualisez les tendances de visibilité.' },
  { title: 'Recherche de mots-clés', desc: 'Découvrez des mots-clés avec des suggestions réelles. Ajoutez-les à vos projets en un clic.' },
  { title: 'Analyse concurrentielle', desc: 'Comparez vos positions à celles de vos concurrents.' },
];

export default function LandingPage() {
  return (
    <div>
      <section className="py-24 text-center px-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl max-w-2xl mx-auto">
          L&apos;intelligence SEO pour freelances et petites agences
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
          Audits, suivi de positions, recherche de mots-clés et analyse concurrentielle — le tout dans une seule plateforme. Sans tarifs enterprise.
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <Link href="/signup">
            <Button size="lg" className="px-6">Essai gratuit</Button>
          </Link>
          <Link href="/#features">
            <Button variant="outline" size="lg" className="px-6">Voir les fonctionnalités</Button>
          </Link>
        </div>
      </section>

      <section id="features" className="py-20 bg-muted/50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12">Tout ce dont vous avez besoin pour gagner en SEO</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-card border rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12">Tarifs simples</h2>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="border rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg">Gratuit</h3>
              <p className="text-3xl font-bold mt-2">&euro;0<span className="text-sm font-normal text-muted-foreground">/mois</span></p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>1 projet</li><li>20 mots-clés</li><li>1 audit / mois</li><li>100 pages / audit</li><li>Historique 30 jours</li>
              </ul>
              <Link href="/signup"><Button variant="outline" className="mt-6 w-full">Commencer</Button></Link>
            </div>
            <div className="border rounded-xl p-6 shadow-sm bg-brand text-white">
              <h3 className="font-semibold text-lg">Pro</h3>
              <p className="text-3xl font-bold mt-2">&euro;39<span className="text-sm font-normal text-white/60">/mois</span></p>
              <ul className="mt-4 space-y-2 text-sm text-white/80">
                <li>5 projets</li><li>500 mots-clés</li><li>10 audits / mois</li><li>500 pages / audit</li><li>Historique 180 jours</li><li>Export PDF</li>
              </ul>
              <Link href="/signup"><Button className="mt-6 w-full bg-white text-brand hover:bg-white/90">Commencer</Button></Link>
            </div>
            <div className="border rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg">Agence</h3>
              <p className="text-3xl font-bold mt-2">&euro;99<span className="text-sm font-normal text-muted-foreground">/mois</span></p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>20 projets</li><li>5 000 mots-clés</li><li>Audits illimités</li><li>2 000 pages / audit</li><li>Historique 730 jours</li><li>PDF marque blanche</li>
              </ul>
              <Link href="/signup"><Button variant="outline" className="mt-6 w-full">Commencer</Button></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12">Ils nous font confiance</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <p className="text-sm italic">&ldquo;Bientôt vos témoignages ici&rdquo;</p>
              <div className="mt-4">
                <p className="text-sm font-semibold">Votre entreprise</p>
                <p className="text-xs text-muted-foreground">Bientôt</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
