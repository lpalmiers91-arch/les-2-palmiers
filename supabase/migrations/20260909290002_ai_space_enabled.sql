-- Expose "l'assistant est-il actif pour cet espace ?" en lecture publique,
-- sans ouvrir toute la table ai_settings (réservée au staff).
create or replace function public.ai_space_enabled(p_space text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select p_space = any(enabled_spaces) from public.ai_settings where id = 1),
    true
  );
$$;

grant execute on function public.ai_space_enabled(text) to anon, authenticated;
