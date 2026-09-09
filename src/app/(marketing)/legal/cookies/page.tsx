import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Politique cookies",
  description: "Les cookies et traceurs utilisés par le site Les 2 Palmiers.",
};

export default function CookiesPage() {
  return (
    <>
      <span className="eyebrow">Traceurs</span>
      <h1>Politique cookies</h1>
      <p>Dernière mise à jour : septembre 2026</p>

      <h2>Ce que nous utilisons</h2>
      <p>
        Nous limitons les traceurs au strict nécessaire. Aucun cookie publicitaire ni de suivi
        tiers n&apos;est déposé.
      </p>
      <ul>
        <li>
          <strong>Cookies nécessaires</strong> — session d&apos;authentification, sécurité, préférence
          d&apos;affichage. Ils ne peuvent pas être désactivés.
        </li>
        <li>
          <strong>Mesure d&apos;audience anonyme</strong> — statistiques de fréquentation agrégées,
          déposées uniquement après votre accord via la bannière.
        </li>
      </ul>

      <h2>Votre choix</h2>
      <p>
        À votre première visite, une bannière vous permet d&apos;accepter ou de refuser la mesure
        d&apos;audience. Vous pouvez revenir sur ce choix à tout moment en effaçant les données du site
        dans votre navigateur.
      </p>

      <h2>Durée</h2>
      <p>
        Les cookies de session expirent à la fermeture du navigateur ou à la déconnexion. La
        préférence de consentement est conservée jusqu&apos;à 6 mois.
      </p>

      <h2>Contact</h2>
      <p>
        Une question ? Écrivez à <a href={`mailto:${site.email}`}>{site.email}</a>.
      </p>
    </>
  );
}
