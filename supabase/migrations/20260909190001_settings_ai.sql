-- Les 2 Palmiers — paramètres du site & tables de l'assistant IA (Phases 2 / 10 / T)
-- Réf. docs/MODELE-DONNEES.md §8-§8bis, docs/ASSISTANT-IA.md

-- =====================================================================
--  Paramètres généraux (singleton)
-- =====================================================================

create table public.site_settings (
  id                    int primary key default 1 check (id = 1),
  company               jsonb not null default '{}'::jsonb,
  legal                 jsonb not null default '{}'::jsonb,
  notification_defaults jsonb not null default '{}'::jsonb,
  payment_config        jsonb not null default '{}'::jsonb,   -- non secret
  locales               text[] not null default '{fr}',
  updated_by            uuid references public.profiles(id),
  updated_at            timestamptz not null default now()
);

insert into public.site_settings (id, company, locales) values (
  1,
  jsonb_build_object(
    'name',    'Les 2 Palmiers – Appartement de Rêve',
    'city',    'Cotonou',
    'country', 'Bénin',
    'phones',  jsonb_build_array('+229 01 64 65 63 63', '+229 01 40 69 55 34'),
    'email',   'bonjour@les2palmiers.site',
    'domain',  'les2palmiers.site',
    'tagline', 'Profitez pleinement de votre temps… nous nous occupons du reste.'
  ),
  '{fr,en}'
) on conflict (id) do nothing;

create trigger trg_site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- =====================================================================
--  Assistant IA — configuration (singleton, éditable par l'admin)
-- =====================================================================

create table public.ai_settings (
  id                 int primary key default 1 check (id = 1),
  enabled_spaces     text[] not null default '{public,client,staff,admin}',
  default_provider   text not null default 'echo',           -- anthropic|openai|google|mistral|openai-compatible|echo
  default_model      text,
  provider_by_role   jsonb not null default '{}'::jsonb,
  system_prompts     jsonb not null default '{}'::jsonb,
  welcome_messages   jsonb not null default '{}'::jsonb,
  quotas             jsonb not null default '{}'::jsonb,      -- messages/jour par rôle
  monthly_budget_usd numeric(10,2),
  updated_by         uuid references public.profiles(id),
  updated_at         timestamptz not null default now()
);
comment on table public.ai_settings is 'Aucune clé API ici — les secrets sont dans les variables d''env des Edge Functions.';

insert into public.ai_settings (id, welcome_messages) values (
  1,
  jsonb_build_object(
    'client', 'Bonjour ! Je peux vous aider à réserver, commander un service ou répondre à vos questions sur le séjour.',
    'public', 'Bonjour ! Une question sur l''appartement, les services ou la réservation ?'
  )
) on conflict (id) do nothing;

create trigger trg_ai_settings_updated_at
  before update on public.ai_settings
  for each row execute function public.set_updated_at();

-- =====================================================================
--  Assistant IA — fils de discussion & messages
-- =====================================================================

create table public.ai_threads (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  space           text not null check (space in ('public','client','staff','admin')),
  title           text,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index ai_threads_user_idx on public.ai_threads(user_id, last_message_at desc);

create table public.ai_messages (
  id         bigint generated always as identity primary key,
  thread_id  uuid not null references public.ai_threads(id) on delete cascade,
  role       text not null check (role in ('user','assistant','tool','system')),
  content    text not null default '',
  tool_calls jsonb,
  tokens_in  int not null default 0,
  tokens_out int not null default 0,
  provider   text,
  model      text,
  created_at timestamptz not null default now()
);
create index ai_messages_thread_idx on public.ai_messages(thread_id, created_at);

create table public.ai_usage (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  day          date not null default current_date,
  messages     int not null default 0,
  tokens_in    bigint not null default 0,
  tokens_out   bigint not null default 0,
  est_cost_usd numeric(10,4) not null default 0,
  unique (user_id, day)
);

-- =====================================================================
--  Base de connaissances (RAG)
-- =====================================================================

create table public.kb_articles (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  title      text not null,
  body       text not null,
  audience   text not null default 'public' check (audience in ('public','client','staff')),
  tags       text[] not null default '{}',
  embedding  vector(1536),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
create index kb_articles_audience_idx on public.kb_articles(audience);

create trigger trg_kb_articles_updated_at
  before update on public.kb_articles
  for each row execute function public.set_updated_at();

-- =====================================================================
--  Audit sur les tables de configuration
-- =====================================================================

create trigger trg_audit_site_settings after insert or update or delete on public.site_settings
  for each row execute function public.audit_trigger();
create trigger trg_audit_ai_settings after insert or update or delete on public.ai_settings
  for each row execute function public.audit_trigger();

-- =====================================================================
--  RLS
-- =====================================================================

alter table public.site_settings enable row level security;
alter table public.ai_settings   enable row level security;
alter table public.ai_threads    enable row level security;
alter table public.ai_messages   enable row level security;
alter table public.ai_usage      enable row level security;
alter table public.kb_articles   enable row level security;

-- site_settings : lecture publique, écriture settings.edit
create policy site_settings_read  on public.site_settings for select using (true);
create policy site_settings_write on public.site_settings for all to authenticated
  using (public.has_permission(auth.uid(),'settings.edit'))
  with check (public.has_permission(auth.uid(),'settings.edit'));

-- ai_settings : lecture staff, écriture ai.configure
create policy ai_settings_read  on public.ai_settings for select to authenticated
  using (public.is_staff(auth.uid()));
create policy ai_settings_write on public.ai_settings for all to authenticated
  using (public.has_permission(auth.uid(),'ai.configure'))
  with check (public.has_permission(auth.uid(),'ai.configure'));

-- fils & messages IA : privés à l'utilisateur (+ audit.view en lecture)
create policy ai_threads_own on public.ai_threads for select to authenticated
  using (user_id = auth.uid() or public.has_permission(auth.uid(),'audit.view'));
create policy ai_messages_own on public.ai_messages for select to authenticated
  using (exists (
    select 1 from public.ai_threads t
    where t.id = thread_id
      and (t.user_id = auth.uid() or public.has_permission(auth.uid(),'audit.view'))
  ));
create policy ai_usage_own on public.ai_usage for select to authenticated
  using (user_id = auth.uid() or public.has_permission(auth.uid(),'reports.view'));

-- base de connaissances : selon l'audience
create policy kb_read on public.kb_articles for select to anon, authenticated
  using (
    audience = 'public'
    or (audience = 'client' and auth.uid() is not null)
    or (audience = 'staff'  and public.is_staff(auth.uid()))
  );
create policy kb_write on public.kb_articles for all to authenticated
  using (public.has_permission(auth.uid(),'settings.edit'))
  with check (public.has_permission(auth.uid(),'settings.edit'));

-- =====================================================================
--  GRANTS
-- =====================================================================

grant select on public.site_settings, public.kb_articles to anon, authenticated;
grant select on public.ai_settings, public.ai_threads, public.ai_messages, public.ai_usage to authenticated;
grant insert, update, delete on public.site_settings, public.ai_settings, public.kb_articles to authenticated;
