# Comptes de démonstration

> Créés dans Supabase Auth (via l'API admin — impossible en SQL pur). Mot de passe commun : **`Demo2026!`**

**Deux portes d'entrée séparées :**
- Client → `/connexion`
- Staff & admin → `/equipe` (page dédiée, `noindex`)

| Rôle | E-mail | Mot de passe | Entrée |
|---|---|---|---|
| Client | `client@les2palmiers.site` | `Demo2026!` | `/connexion` |
| Staff (Accueil) | `staff@les2palmiers.site` | `Demo2026!` | `/equipe` |
| Administrateur | `admin@les2palmiers.site` | `Demo2026!` | `/equipe` |

> **Reset** (septembre 2026) : toutes les données transactionnelles (réservations,
> paiements, messages, notifications, contrats, KYC, audit) ont été vidées et les
> comptes de test supprimés. Seuls ces 3 comptes démo subsistent, sans historique.
> Script : `scratchpad/reset.sql`.

- Les 3 comptes ont `email_confirm = true` (pas de mail de confirmation à valider).
- Rôles attribués dans `public.user_roles` ; `staff` et `admin` ont aussi une ligne `public.staff_members`.
- Le client n'a que le rôle `client` (attribué automatiquement par le trigger `handle_new_user`).

## Recréer les comptes (si besoin)

```bash
# service_role key : Dashboard > Project Settings > API  (ou Management API ?reveal=true)
SR="<service_role_key>"
BASE="https://zmobadwgoqcwkryefciq.supabase.co"

for u in "client@les2palmiers.site:Awa Client" \
         "staff@les2palmiers.site:Koffi Staff" \
         "admin@les2palmiers.site:Propriétaire"; do
  email="${u%%:*}"; name="${u##*:}"
  curl -s -X POST "$BASE/auth/v1/admin/users" \
    -H "apikey: $SR" -H "Authorization: Bearer $SR" -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"Demo2026!\",\"email_confirm\":true,\"user_metadata\":{\"full_name\":\"$name\"}}"
done
```

Puis en SQL (adapter les UUID renvoyés) :

```sql
insert into public.user_roles (user_id, role_id) values
  ('<staff_uid>','staff'), ('<admin_uid>','admin')
on conflict do nothing;

insert into public.staff_members (user_id, job_title) values
  ('<staff_uid>','Accueil'), ('<admin_uid>','Propriétaire')
on conflict (user_id) do nothing;
```

> ⚠️ Ne pas committer la `service_role` key. En production, ces comptes de démo sont retirés.
