-- Realtime pour les frais de séjour : le client et l'équipe voient les
-- changements de statut (créé, réglé, annulé) sans recharger la page.
do $$
begin
  execute 'alter publication supabase_realtime add table public.reservation_charges';
exception when duplicate_object then null; end $$;
