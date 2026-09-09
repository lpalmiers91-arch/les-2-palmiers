-- Les 2 Palmiers — démo : le compte staff peut démontrer tout l'espace staff.
-- En production, ces permissions restent réservées à l'admin ou à un rôle dédié.
insert into public.role_permissions (role_id, permission_key) values
  ('staff','catalog.edit'),
  ('staff','pricing.edit'),
  ('staff','apartments.edit'),
  ('staff','media.edit'),
  ('coordinator','messages.handle')
on conflict do nothing;
