-- Realtime pour l'auto-actualisation des tableaux de bord (LiveRefresh).
do $$
begin
  execute 'alter publication supabase_realtime add table public.reservations';
exception when duplicate_object then null; end $$;

do $$
begin
  execute 'alter publication supabase_realtime add table public.service_orders';
exception when duplicate_object then null; end $$;

do $$
begin
  execute 'alter publication supabase_realtime add table public.payments';
exception when duplicate_object then null; end $$;

do $$
begin
  execute 'alter publication supabase_realtime add table public.reservation_events';
exception when duplicate_object then null; end $$;
