import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment Les 2 Palmiers collecte et protège vos données personnelles.",
};

export default function ConfidentialitePage() {
  return (
    <>
      <span className="eyebrow">Vos données</span>
      <h1>Politique de confidentialité</h1>
      <p>Dernière mise à jour : septembre 2026</p>

      <h2>Responsable du traitement</h2>
      <p>
        {site.legalName}, {site.city}, {site.country}. Pour toute question relative à vos données,
        écrivez à <a href={`mailto:${site.email}`}>{site.email}</a>.
      </p>

      <h2>Données collectées</h2>
      <ul>
        <li>Identité et contact : nom, adresse e-mail, numéro de téléphone.</li>
        <li>Compte : mot de passe (stocké chiffré), rôle, préférences.</li>
        <li>Réservations et commandes : dates de séjour, services demandés, échanges avec l&apos;équipe.</li>
        <li>Paiements : montants et statuts. En démonstration, les paiements sont simulés.</li>
        <li>Techniques : journaux de connexion et mesure d&apos;audience anonyme.</li>
      </ul>

      <h2>Finalités</h2>
      <p>
        Vos données servent à gérer votre compte et vos réservations, à assurer la relation client,
        à sécuriser le service et à améliorer le site. Elles ne sont jamais vendues.
      </p>

      <h2>Base légale</h2>
      <p>
        Exécution du contrat (réservations, services), intérêt légitime (sécurité, amélioration) et
        consentement (mesure d&apos;audience).
      </p>

      <h2>Destinataires et sous-traitants</h2>
      <ul>
        <li>Supabase — hébergement de la base de données et authentification.</li>
        <li>Vercel — hébergement du site.</li>
        <li>Resend — envoi des e-mails transactionnels (confirmation, réinitialisation).</li>
        <li>Le fournisseur d&apos;IA configuré — traitement des messages envoyés à l&apos;assistant.</li>
      </ul>

      <h2>Durée de conservation</h2>
      <p>
        Les données de compte sont conservées tant que le compte est actif, puis supprimées ou
        anonymisées. Les données de réservation sont conservées pour la durée légale applicable.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de limitation et
        d&apos;opposition. Exercez-les en écrivant à <a href={`mailto:${site.email}`}>{site.email}</a>.
      </p>

      <h2>Cookies</h2>
      <p>
        Le site utilise uniquement les cookies nécessaires à son fonctionnement et, avec votre
        accord, une mesure d&apos;audience anonyme. Voir la <a href="/legal/cookies">politique cookies</a>.
      </p>
    </>
  );
}
