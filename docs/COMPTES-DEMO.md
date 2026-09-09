# Comptes de démonstration

> Créés dans Supabase Auth (via l'API admin — impossible en SQL pur). Mot de passe commun : **`Demo2026!`**

| Rôle | E-mail | Mot de passe | user_id |
|---|---|---|---|
| Client | `client@les2palmiers.site` | `Demo2026!` | `4b201d09-e614-4971-88dc-fa8af5db9471` |
| Staff (Accueil) | `staff@les2palmiers.site` | `Demo2026!` | `3044e5c5-0422-4774-8e6e-c08781e932ae` |
| Administrateur | `admin@les2palmiers.site` | `Demo2026!` | `058024c4-4e39-4115-a06f-4daa436d0456` |

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
