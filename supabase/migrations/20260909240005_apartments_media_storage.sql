-- Les 2 Palmiers — gestion des appartements par le staff :
-- lien carte + politique d'écriture sur le bucket apartment-media.

alter table public.apartments
  add column if not exists map_url text;   -- lien Google Maps / plan

-- Le bucket apartment-media est public en lecture. On autorise l'écriture
-- aux détenteurs de la permission media.edit (staff/admin en démo).
drop policy if exists "apartment-media staff write" on storage.objects;
create policy "apartment-media staff write" on storage.objects for insert to authenticated
  with check (bucket_id = 'apartment-media' and public.has_permission(auth.uid(), 'media.edit'));

drop policy if exists "apartment-media staff update" on storage.objects;
create policy "apartment-media staff update" on storage.objects for update to authenticated
  using (bucket_id = 'apartment-media' and public.has_permission(auth.uid(), 'media.edit'));

drop policy if exists "apartment-media staff delete" on storage.objects;
create policy "apartment-media staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'apartment-media' and public.has_permission(auth.uid(), 'media.edit'));

drop policy if exists "apartment-media public read" on storage.objects;
create policy "apartment-media public read" on storage.objects for select
  using (bucket_id = 'apartment-media');
