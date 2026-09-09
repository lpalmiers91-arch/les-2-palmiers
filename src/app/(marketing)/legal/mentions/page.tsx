import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Informations légales relatives au site Les 2 Palmiers.",
};

export default function MentionsPage() {
  return (
    <>
      <span className="eyebrow">Informations légales</span>
      <h1>Mentions légales</h1>
      <p>Dernière mise à jour : septembre 2026</p>

      <h2>Éditeur</h2>
      <p>
        Ce site est édité par <strong>{site.legalName}</strong>, activité de location d&apos;appartement
        meublé et de conciergerie basée à {site.city}, {site.country}.
      </p>
      <ul>
        <li>Adresse : {site.city}, {site.country}</li>
        <li>
          Courriel : <a href={`mailto:${site.email}`}>{site.email}</a>
        </li>
        <li>Téléphone : {site.phones.join(" · ")}</li>
      </ul>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par Vercel Inc. (340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis).
        Les données applicatives sont hébergées par Supabase.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des contenus présents sur ce site (textes, visuels, identité visuelle) est la
        propriété de {site.legalName}, sauf mention contraire. Toute reproduction sans autorisation
        écrite préalable est interdite.
      </p>

      <h2>Nature du site</h2>
      <p>
        Cette version est une <strong>démonstration</strong>. Les paiements y sont simulés et aucune
        transaction financière réelle n&apos;est effectuée.
      </p>
    </>
  );
}
