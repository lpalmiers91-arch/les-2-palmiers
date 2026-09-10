-- =====================================================================
--  Temps réel : REPLICA IDENTITY FULL sur les tables où un utilisateur
--  doit voir en direct une modification faite par un autre.
--  Sans cela, Supabase Realtime ne peut pas évaluer la RLS sur les
--  événements UPDATE/DELETE et les abandonne silencieusement pour les
--  abonnés non propriétaires (ex. suppression d'un message vue par l'autre
--  partie, publication d'un avis vue en direct dans la console).
-- =====================================================================

alter table public.messages replica identity full;
alter table public.reviews replica identity full;
alter table public.notifications replica identity full;
alter table public.reservations replica identity full;
alter table public.service_orders replica identity full;
alter table public.reservation_change_requests replica identity full;
