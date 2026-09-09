-- Les 2 Palmiers — messagerie temps réel & notifications (Phase 8)
-- Réf. docs/MODELE-DONNEES.md §6-§7, docs/FONCTIONNALITES.md §N-§O

-- =====================================================================
--  Messagerie
-- =====================================================================

create table public.conversations (
  id                uuid primary key default gen_random_uuid(),
  subject           text,
  type              text not null default 'support' check (type in ('reservation','support')),
  reservation_id    uuid references public.reservations(id) on delete set null,
  customer_id       uuid not null references public.profiles(id) on delete cascade,
  assigned_staff_id uuid references public.profiles(id) on delete set null,
  status            text not null default 'open' check (status in ('open','closed')),
  last_message_at   timestamptz not null default now(),
  created_at        timestamptz not null default now()
);
create index conversations_customer_idx on public.conversations(customer_id);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid references public.profiles(id) on delete set null,
  body            text not null default '',
  attachments     jsonb not null default '[]'::jsonb,        -- chemins Storage (bucket privé)
  system          boolean not null default false,
  created_at      timestamptz not null default now()
);
create index messages_conversation_idx on public.messages(conversation_id, created_at);

create table public.message_reads (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  read_at    timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table public.canned_responses (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  category   text,
  created_by uuid references public.profiles(id) on delete set null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- un nouveau message met à jour la conversation + la rouvre si besoin
create or replace function public.on_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
    set last_message_at = new.created_at,
        status = case when status = 'closed' then 'open' else status end
    where id = new.conversation_id;
  return new;
end;
$$;

create trigger trg_messages_touch_conversation
  after insert on public.messages
  for each row execute function public.on_new_message();

-- =====================================================================
--  Notifications
-- =====================================================================

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  data       jsonb not null default '{}'::jsonb,
  channels   text[] not null default '{in_app}',            -- in_app,email,push,whatsapp
  read_at    timestamptz,
  sent_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null,
  keys       jsonb not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- helper : notifier tous les membres du staff pouvant traiter la messagerie
create or replace function public.notify_staff(p_type text, p_title text, p_body text, p_data jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, type, title, body, data)
  select distinct ur.user_id, p_type, p_title, p_body, p_data
  from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  where rp.permission_key = 'messages.handle';
$$;

-- nouveau message -> notification à l'autre partie
create or replace function public.on_message_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_conv public.conversations;
  v_sender_is_staff boolean;
begin
  if new.system then return new; end if;
  select * into v_conv from public.conversations where id = new.conversation_id;
  v_sender_is_staff := public.is_staff(new.sender_id);

  if v_sender_is_staff then
    -- prévenir le client
    insert into public.notifications (user_id, type, title, body, data)
    values (v_conv.customer_id, 'message',
            'Nouveau message de Les 2 Palmiers',
            left(new.body, 140),
            jsonb_build_object('conversation_id', v_conv.id));
  else
    -- prévenir le staff
    perform public.notify_staff('message',
            'Nouveau message client',
            left(new.body, 140),
            jsonb_build_object('conversation_id', v_conv.id, 'customer_id', v_conv.customer_id));
  end if;
  return new;
end;
$$;

create trigger trg_messages_notify
  after insert on public.messages
  for each row execute function public.on_message_notify();

-- =====================================================================
--  RPC : envoyer un message (crée la conversation support au besoin)
-- =====================================================================

create or replace function public.send_message(
  p_conversation uuid,
  p_body text,
  p_attachments jsonb default '[]'::jsonb
) returns public.messages
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_conv public.conversations;
  v_msg public.messages;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if coalesce(trim(p_body), '') = '' and coalesce(jsonb_array_length(p_attachments), 0) = 0 then
    raise exception 'empty_message';
  end if;

  select * into v_conv from public.conversations where id = p_conversation;
  if not found then raise exception 'conversation_not_found'; end if;

  if v_conv.customer_id <> v_uid and not public.has_permission(v_uid,'messages.handle') then
    raise exception 'forbidden';
  end if;

  insert into public.messages (conversation_id, sender_id, body, attachments)
  values (p_conversation, v_uid, coalesce(p_body,''), coalesce(p_attachments,'[]'::jsonb))
  returning * into v_msg;

  return v_msg;
end;
$$;

create or replace function public.open_support_conversation(p_subject text default null)
returns public.conversations
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_conv public.conversations;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_conv from public.conversations
  where customer_id = v_uid and type = 'support' and status = 'open'
  order by last_message_at desc limit 1;

  if found then return v_conv; end if;

  insert into public.conversations (subject, type, customer_id)
  values (coalesce(p_subject, 'Support'), 'support', v_uid)
  returning * into v_conv;
  return v_conv;
end;
$$;

-- =====================================================================
--  RLS
-- =====================================================================

alter table public.conversations     enable row level security;
alter table public.messages          enable row level security;
alter table public.message_reads     enable row level security;
alter table public.canned_responses  enable row level security;
alter table public.notifications     enable row level security;
alter table public.push_subscriptions enable row level security;

create policy conversations_select on public.conversations for select to authenticated
  using (customer_id = auth.uid() or public.has_permission(auth.uid(),'messages.handle'));
create policy conversations_staff_update on public.conversations for update to authenticated
  using (public.has_permission(auth.uid(),'messages.handle'))
  with check (public.has_permission(auth.uid(),'messages.handle'));

create policy messages_select on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.customer_id = auth.uid() or public.has_permission(auth.uid(),'messages.handle'))
  ));

create policy message_reads_own on public.message_reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy canned_read on public.canned_responses for select to authenticated
  using (public.has_permission(auth.uid(),'messages.handle'));
create policy canned_write on public.canned_responses for all to authenticated
  using (public.has_permission(auth.uid(),'messages.handle'))
  with check (public.has_permission(auth.uid(),'messages.handle'));

create policy notifications_own on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
--  Realtime
-- =====================================================================

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.notifications;

-- =====================================================================
--  GRANTS
-- =====================================================================

grant select on public.conversations, public.messages, public.canned_responses,
                 public.notifications to authenticated;
grant insert, update, delete on public.message_reads, public.push_subscriptions to authenticated;
grant update on public.notifications, public.conversations to authenticated;
grant insert, update, delete on public.canned_responses to authenticated;

grant execute on function public.send_message(uuid, text, jsonb)      to authenticated;
grant execute on function public.open_support_conversation(text)      to authenticated;
