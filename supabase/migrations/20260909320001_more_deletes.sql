-- =====================================================================
--  Tout ce qui s'ajoute doit pouvoir se supprimer :
--  avis, notifications, + service (catalogue) via RPC dédiée.
-- =====================================================================

-- Supprimer un avis (staff)
create or replace function public.delete_review(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission(auth.uid(), 'reviews.moderate') then raise exception 'forbidden'; end if;
  delete from public.reviews where id = p_id;
end $$;
grant execute on function public.delete_review(uuid) to authenticated;

-- Supprimer / vider ses notifications (tout utilisateur)
create or replace function public.delete_notification(p_id uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.notifications where id = p_id and user_id = auth.uid();
$$;
grant execute on function public.delete_notification(uuid) to authenticated;

create or replace function public.clear_notifications()
returns void language sql security definer set search_path = public as $$
  delete from public.notifications where user_id = auth.uid();
$$;
grant execute on function public.clear_notifications() to authenticated;

-- Créer / supprimer un service depuis le catalogue (staff)
create or replace function public.create_service(p_title text, p_pricing_mode text default 'quote')
returns public.services language plpgsql security definer set search_path = public as $$
declare v_row public.services;
begin
  if not public.has_permission(auth.uid(), 'catalog.edit') then raise exception 'forbidden'; end if;
  insert into public.services (slug, title, pricing_mode, active, position)
  values (
    lower(regexp_replace(coalesce(nullif(trim(p_title), ''), 'service'), '[^a-z0-9]+', '-', 'gi'))
      || '-' || substr(md5(random()::text), 1, 4),
    coalesce(nullif(trim(p_title), ''), 'Nouveau service'),
    case when p_pricing_mode in ('fixed','quote','metered') then p_pricing_mode else 'quote' end,
    false,
    coalesce((select max(position) + 1 from public.services), 0)
  )
  returning * into v_row;
  return v_row;
end $$;
grant execute on function public.create_service(text, text) to authenticated;

create or replace function public.delete_service(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission(auth.uid(), 'catalog.edit') then raise exception 'forbidden'; end if;
  -- garde-fou : refuse si des commandes vivantes utilisent ce service
  if exists (
    select 1 from public.service_orders
    where service_id = p_id and status in ('requested','accepted','scheduled','in_progress')
  ) then
    raise exception 'service_in_use';
  end if;
  delete from public.services where id = p_id;
end $$;
grant execute on function public.delete_service(uuid) to authenticated;
