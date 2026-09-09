# E-mails transactionnels

> Comment sont envoyés les e-mails d'authentification (inscription, mot de passe oublié, etc.). Version 0.1 — 2026-09-09.

## Chaîne d'envoi

```
Visiteur s'inscrit avec SON adresse (ex. jean@gmail.com)
   │
Supabase Auth crée le compte (non confirmé) + un lien unique
   │
Supabase → SMTP  smtp.resend.com:465  (user "resend", pass = clé API Resend send-only)
   │
Resend expédie   DE  "Les 2 Palmiers <noreply@les2palmiers.site>"
                 À   jean@gmail.com
   │
jean@gmail.com reçoit l'e-mail, clique le bouton, compte activé
```

Le visiteur utilise **toujours sa propre adresse**. Resend n'est que le transporteur sortant. Aucune boîte mail `@les2palmiers.site` n'est nécessaire (les envois se font depuis `noreply@`, les réponses ne sont pas attendues).

## Fournisseur

- **Resend** — plan gratuit : 100 e-mails/jour, 3 000/mois. Large pour une démo.
- Domaine Resend : `les2palmiers.site` · id `8ef73779-b6e4-41bd-9db6-6a567e905a46` · région `eu-west-1`.
- Le SMTP par défaut de Supabase (sans Resend) est plafonné à **2 e-mails/heure** → inutilisable en démo.

## DNS à poser chez Hostinger (hPanel → Domaines → les2palmiers.site → DNS)

| Type | Nom / Host | Valeur | Priorité |
|---|---|---|---|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCxdYRMrP0qRBcqGlWYCkaHZV7i1HnU5RMXEl68XaSQF6NZ+HSXv96iJUuMnqpBsY2O8QJ7OafxNh1ClPwomg9Efmv1GKKvgT8jPtc4mlcNAt2eLghCetD8B5BEBO9QEePXHwBgbUAud7ngx2j1O+fBQx9v7O16usSvhThBJPuz+Q` | — |
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` | `10` |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |
| TXT *(optionnel)* | `_dmarc` | `v=DMARC1; p=none;` | — |

- Champ **Nom** = le sous-domaine seul (`resend._domainkey`, `send`), pas le domaine complet.
- DKIM : coller la valeur d'un seul bloc, sans espace ni retour à la ligne.

## Séquence de mise en service — ✅ TERMINÉE (2026-09-09)

1. ✅ 3 enregistrements DNS posés chez Hostinger (via l'API Hostinger).
2. ✅ Domaine `les2palmiers.site` **`verified`** dans Resend (DKIM + SPF + MX).
3. ✅ SMTP custom actif dans Supabase Auth : `smtp.resend.com:465`, user `resend`, sender `Les 2 Palmiers <noreply@les2palmiers.site>`, `rate_limit_email_sent=30/h`, `site_url=https://les2palmiers.site`.
4. ✅ Les 5 templates FR poussés (débloqué par l'activation du SMTP custom).
5. ✅ Test d'envoi : e-mail `noreply@les2palmiers.site` → `weareuseia@gmail.com` = **`delivered`**.

`uri_allow_list` = `localhost:3000` + `127.0.0.1:3000` + `les2palmiers.site` + `www` + `*.vercel.app`.
`enable_confirmations = true` (l'inscription exige la confirmation de l'e-mail).

## Les 5 modèles (`supabase/templates/`)

| Fichier | Objet | Quand |
|---|---|---|
| `confirmation.html` | Confirmez votre inscription — Les 2 Palmiers | à la création de compte |
| `recovery.html` | Réinitialisez votre mot de passe — Les 2 Palmiers | « mot de passe oublié » |
| `magic_link.html` | Votre lien de connexion — Les 2 Palmiers | connexion par lien (si activée) |
| `email_change.html` | Confirmez votre nouvelle adresse — Les 2 Palmiers | changement d'e-mail |
| `invite.html` | Vous êtes invité(e) — Les 2 Palmiers | création d'un compte staff/admin par l'admin |

Charte : en-tête vert palmier, bouton or, texte FR, pied de page `les2palmiers.site`. Variables Supabase utilisées : `{{ .ConfirmationURL }}`, `{{ .NewEmail }}`.

## Aperçu (e-mail de confirmation)

```
De : Les 2 Palmiers <noreply@les2palmiers.site>
Objet : Confirmez votre inscription — Les 2 Palmiers

        LES 2 PALMIERS
   APPARTEMENT DE RÊVE · COTONOU

  Bonjour,

  Merci de créer votre compte sur Les 2 Palmiers. Confirmez
  votre adresse e-mail pour accéder à vos réservations,
  commander des services et échanger avec notre équipe.

        [ Confirmer mon adresse → ]

  Ce lien expire dans 1 heure. Si vous n'êtes pas à
  l'origine de cette demande, ignorez cet e-mail.

  Les 2 Palmiers · Cotonou, Bénin · les2palmiers.site
```

## Plus tard : recevoir des e-mails à `@les2palmiers.site`

Non nécessaire pour la démo. Options le jour venu : boîte Hostinger (~1 €/mois) ou redirection gratuite vers une adresse Gmail.
