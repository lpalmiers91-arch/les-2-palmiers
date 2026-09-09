-- Buckets : pièces jointes messagerie, preuves de paiement, médias CMS, branding.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('message-attachments', 'message-attachments', false, 15728640,
   array['image/jpeg','image/png','image/webp','image/heic','image/gif','application/pdf']),
  ('payment-proofs', 'payment-proofs', false, 10485760,
   array['image/jpeg','image/png','image/webp','image/heic','application/pdf']),
  ('site-media', 'site-media', true, 10485760,
   array['image/jpeg','image/png','image/webp','image/avif','image/svg+xml']),
  ('branding', 'branding', true, 2097152,
   array['image/png','image/x-icon','image/vnd.microsoft.icon','image/svg+xml','image/jpeg','image/webp'])
on conflict (id) do update set
  public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- message-attachments : chaque utilisateur écrit dans <uid>/... ; lecture
-- réservée aux participants de la conversation (contrôle applicatif via URL signée
-- générée côté serveur/RPC — ici on autorise l'écriture perso + lecture perso + staff).
drop policy if exists "msg-att owner write" on storage.objects;
create policy "msg-att owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'message-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "msg-att read" on storage.objects;
create policy "msg-att read" on storage.objects for select to authenticated
  using (
    bucket_id = 'message-attachments'
    and ((storage.foldername(name))[1] = auth.uid()::text
         or public.has_permission(auth.uid(),'messages.handle'))
  );

-- payment-proofs : le client écrit son dossier ; lecture client + staff payments.view
drop policy if exists "proof owner write" on storage.objects;
create policy "proof owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "proof read" on storage.objects;
create policy "proof read" on storage.objects for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and ((storage.foldername(name))[1] = auth.uid()::text
         or public.has_permission(auth.uid(),'payments.view'))
  );

-- site-media : lecture publique, écriture cms.edit
drop policy if exists "site-media read" on storage.objects;
create policy "site-media read" on storage.objects for select using (bucket_id = 'site-media');
drop policy if exists "site-media write" on storage.objects;
create policy "site-media write" on storage.objects for all to authenticated
  using (bucket_id = 'site-media' and public.has_permission(auth.uid(),'cms.edit'))
  with check (bucket_id = 'site-media' and public.has_permission(auth.uid(),'cms.edit'));

-- branding : lecture publique, écriture cms.edit
drop policy if exists "branding read" on storage.objects;
create policy "branding read" on storage.objects for select using (bucket_id = 'branding');
drop policy if exists "branding write" on storage.objects;
create policy "branding write" on storage.objects for all to authenticated
  using (bucket_id = 'branding' and public.has_permission(auth.uid(),'cms.edit'))
  with check (bucket_id = 'branding' and public.has_permission(auth.uid(),'cms.edit'));
