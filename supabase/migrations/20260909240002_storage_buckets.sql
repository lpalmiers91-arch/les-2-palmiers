-- Les 2 Palmiers — buckets Storage : avatars (public) + identity-docs (privé)
-- Réf. Phase 9 (profil + KYC)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880,
   array['image/jpeg','image/png','image/webp','image/avif']),
  ('identity-docs', 'identity-docs', false, 10485760,
   array['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---- avatars : lecture publique, écriture dans son propre dossier <uid>/ ----
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars owner write" on storage.objects;
create policy "avatars owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---- identity-docs : privé. Le client écrit/lit son dossier <uid>/,
--      le staff identity.review lit tout. Pas de suppression après soumission. ----
drop policy if exists "identity owner read" on storage.objects;
create policy "identity owner read" on storage.objects for select to authenticated
  using (
    bucket_id = 'identity-docs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.has_permission(auth.uid(), 'identity.review')
    )
  );

drop policy if exists "identity owner write" on storage.objects;
create policy "identity owner write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'identity-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "identity owner replace" on storage.objects;
create policy "identity owner replace" on storage.objects for update to authenticated
  using (
    bucket_id = 'identity-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
