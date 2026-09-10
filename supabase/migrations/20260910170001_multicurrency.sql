-- =====================================================================
--  Multi-devise (affichage). Le débit reste en XOF ; on convertit pour
--  l'affichage vitrine. Taux éditables par l'admin.
-- =====================================================================

alter table public.payment_settings
  add column if not exists multicurrency_enabled boolean not null default true,
  add column if not exists fx_rates jsonb not null default
    '{"EUR": 655.957, "USD": 605, "GBP": 770, "CAD": 445}'::jsonb;

-- config publique enrichie
create or replace function public.payment_settings_public()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'provider', active_provider,
    'mode', mode,
    'public_key', case active_provider
                    when 'fedapay' then fedapay_public_key
                    when 'kkiapay' then kkiapay_public_key
                    when 'stripe'  then stripe_public_key
                    else null end,
    'currency', currency,
    'multicurrency', multicurrency_enabled,
    'fx', fx_rates
  )
  from public.payment_settings where id = 1;
$$;
grant execute on function public.payment_settings_public() to anon, authenticated;

-- helper léger et cacheable pour le rendu serveur
create or replace function public.fx_config()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('enabled', multicurrency_enabled, 'rates', fx_rates)
  from public.payment_settings where id = 1;
$$;
grant execute on function public.fx_config() to anon, authenticated;
