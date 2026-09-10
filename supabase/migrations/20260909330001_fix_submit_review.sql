-- =====================================================================
--  FIX : submit_review échouait (42P10) — ON CONFLICT (reservation_id)
--  ne peut pas cibler un index unique PARTIEL sans répéter son prédicat.
-- =====================================================================
create or replace function public.submit_review(
  p_reservation uuid, p_rating int, p_title text, p_body text
) returns public.reviews
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_res public.reservations;
  v_row public.reviews;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_rating not between 1 and 5 then raise exception 'bad_rating'; end if;

  select * into v_res from public.reservations where id = p_reservation;
  if not found or v_res.guest_id <> v_uid then raise exception 'not_your_reservation'; end if;
  if v_res.status not in ('confirmed','in_stay','completed') then
    raise exception 'reservation_not_reviewable';
  end if;

  insert into public.reviews (reservation_id, apartment_id, client_id, rating, title, body)
  values (p_reservation, v_res.apartment_id, v_uid, p_rating, nullif(trim(p_title),''), coalesce(p_body,''))
  on conflict (reservation_id) where reservation_id is not null do update
    set rating = excluded.rating, title = excluded.title, body = excluded.body,
        status = 'pending', updated_at = now()
  returning * into v_row;

  perform public.notify_staff('review', 'Nouvel avis client',
    'Note ' || p_rating || '/5 en attente de modération.',
    jsonb_build_object('review_id', v_row.id));

  return v_row;
end;
$$;

grant execute on function public.submit_review(uuid, int, text, text) to authenticated;
