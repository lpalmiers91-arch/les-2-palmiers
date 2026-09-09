-- Pièces jointes messagerie : lisibles/écrivables par les participants de la
-- conversation (le dossier de premier niveau = l'id de la conversation).

drop policy if exists "msg-att owner write" on storage.objects;
drop policy if exists "msg-att read" on storage.objects;

create policy "msg-att participant read" on storage.objects for select to authenticated
  using (
    bucket_id = 'message-attachments'
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (c.customer_id = auth.uid() or public.has_permission(auth.uid(), 'messages.handle'))
    )
  );

create policy "msg-att participant write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'message-attachments'
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (c.customer_id = auth.uid() or public.has_permission(auth.uid(), 'messages.handle'))
    )
  );

-- le corps d'un message peut être vide s'il y a une pièce jointe → libellé de notif
create or replace function public.on_message_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_conv public.conversations;
  v_sender_is_staff boolean;
  v_preview text;
begin
  if new.system then return new; end if;
  select * into v_conv from public.conversations where id = new.conversation_id;
  v_sender_is_staff := public.is_staff(new.sender_id);
  v_preview := coalesce(nullif(left(new.body, 140), ''),
                        case when jsonb_array_length(coalesce(new.attachments,'[]'::jsonb)) > 0
                             then 'Pièce jointe' else '' end);

  if v_sender_is_staff then
    insert into public.notifications (user_id, type, title, body, data)
    values (v_conv.customer_id, 'message', 'Nouveau message de Les 2 Palmiers', v_preview,
            jsonb_build_object('conversation_id', v_conv.id));
  else
    perform public.notify_staff('message', 'Nouveau message client', v_preview,
            jsonb_build_object('conversation_id', v_conv.id, 'customer_id', v_conv.customer_id));
  end if;
  return new;
end $$;
