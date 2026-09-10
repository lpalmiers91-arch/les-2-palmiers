-- =====================================================================
--  Enregistre la langue choisie à l'inscription (metadata `locale`)
--  dans profiles.locale — utilisée pour tous les e-mails (auth + notify).
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := nullif(btrim(upper(new.raw_user_meta_data->>'referral_code')), '');
  v_referrer uuid;
  v_locale text := lower(left(coalesce(new.raw_user_meta_data->>'locale', 'fr'), 2));
begin
  if v_locale not in ('fr','en','es','zh','ar','pt','de','it','ru','ja') then
    v_locale := 'fr';
  end if;

  insert into public.profiles (id, full_name, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    v_locale
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role_id)
  values (new.id, 'client')
  on conflict do nothing;

  if v_code is not null then
    select client_id into v_referrer from public.referral_codes where code = v_code;
    if v_referrer is not null and v_referrer <> new.id then
      insert into public.referrals (referrer_id, referred_id, code)
      values (v_referrer, new.id, v_code)
      on conflict (referred_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;
