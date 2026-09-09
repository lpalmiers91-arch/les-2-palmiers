import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Conditions générales",
  description: "Conditions générales de réservation et de vente des services Les 2 Palmiers.",
};

export default function CgvPage() {
  return (
    <>
      <span className="eyebrow">Réservations & services</span>
      <h1>Conditions générales</h1>
      <p>Dernière mise à jour : septembre 2026</p>

      <h2>Objet</h2>
      <p>
        Les présentes conditions régissent la réservation de l&apos;appartement meublé et la commande
        des services de conciergerie proposés par <strong>{site.legalName}</strong> à {site.city},
        {" "}{site.country}.
      </p>

      <h2>Démonstration</h2>
      <p>
        Cette version du site est une <strong>démonstration</strong>. Les paiements sont simulés,
        aucune somme n&apos;est débitée et aucune réservation ferme n&apos;est engagée.
      </p>

      <h2>Réservation</h2>
      <ul>
        <li>La réservation devient effective après acceptation du devis et versement de l&apos;acompte.</li>
        <li>Un acompte de 50 % est demandé à la réservation ; le solde est réglé avant l&apos;arrivée.</li>
        <li>Arrivée à partir de {"14 h 00"}, départ avant {"11 h 00"}, sauf accord contraire.</li>
      </ul>

      <h2>Services de conciergerie</h2>
      <p>
        Les services (voiture, ménage, cuisinier, coiffure, massage, garde d&apos;enfants, etc.) sont
        proposés à prix fixe ou sur devis. La commande est confirmée par l&apos;équipe selon les
        disponibilités.
      </p>

      <h2>Annulation</h2>
      <ul>
        <li>Annulation à plus de 7 jours de l&apos;arrivée : remboursement de l&apos;acompte.</li>
        <li>Annulation à moins de 7 jours : acompte conservé.</li>
        <li>Départ anticipé : les nuits réservées restent dues.</li>
      </ul>

      <h2>Responsabilité</h2>
      <p>
        Le client est responsable des dégradations causées pendant le séjour. {site.legalName} ne
        saurait être tenu responsable en cas de force majeure.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question : <a href={`mailto:${site.email}`}>{site.email}</a> ou {site.phones[0]}.
      </p>
    </>
  );
}
