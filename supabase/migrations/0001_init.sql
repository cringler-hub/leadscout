-- LeadScout MVP – Grundschema
-- Mandantenmodell: jede fachliche Tabelle trägt organization_id, RLS erzwingt Trennung.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Europe/Vienna',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  full_name text,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_organization_id_idx on public.profiles (organization_id);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null default 'Lead Scout',
  agent_type text not null default 'lead_scout',
  description text,
  status text not null default 'idle' check (status in ('idle', 'running', 'done', 'error')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index agents_organization_id_idx on public.agents (organization_id);

create table public.search_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  agent_id uuid not null references public.agents (id) on delete cascade,
  industries text[] not null default '{}',
  regions text[] not null default '{}',
  employee_min integer,
  employee_max integer,
  revenue_min bigint,
  company_traits text[] not null default '{}',
  buying_signals text[] not null default '{}',
  exclusion_criteria text[] not null default '{}',
  target_roles text[] not null default '{}',
  max_leads_per_run integer not null default 10,
  report_email text,
  schedule_time time not null default '06:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index search_profiles_organization_id_idx on public.search_profiles (organization_id);
create index search_profiles_agent_id_idx on public.search_profiles (agent_id);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  agent_id uuid not null references public.agents (id) on delete cascade,
  search_profile_id uuid references public.search_profiles (id) on delete set null,
  company_name text not null,
  website text,
  industry text,
  location text,
  employee_count integer,
  estimated_revenue bigint,
  lead_score integer check (lead_score between 0 and 100),
  score_details jsonb not null default '{}',
  reasoning text,
  buying_signals text[] not null default '{}',
  recommended_role text,
  conversation_trigger text,
  source_urls text[] not null default '{}',
  status text not null default 'neu' check (status in ('neu', 'relevant', 'nicht_relevant', 'ins_crm')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_organization_id_idx on public.leads (organization_id);
create index leads_agent_id_idx on public.leads (agent_id);
create index leads_status_idx on public.leads (status);
create index leads_created_at_idx on public.leads (created_at desc);
-- Duplikat-Vermeidung: gleiche Website nicht zweimal pro Mandant anlegen.
create unique index leads_org_website_unique_idx on public.leads (organization_id, lower(website))
  where website is not null;

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  agent_id uuid not null references public.agents (id) on delete cascade,
  search_profile_id uuid references public.search_profiles (id) on delete set null,
  status text not null default 'running' check (status in ('running', 'completed', 'error')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  leads_found integer not null default 0,
  leads_qualified integer not null default 0,
  n8n_execution_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create index agent_runs_organization_id_idx on public.agent_runs (organization_id);
create index agent_runs_agent_id_started_at_idx on public.agent_runs (agent_id, started_at desc);

create table public.lead_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  feedback text not null check (feedback in ('relevant', 'nicht_relevant')),
  comment text,
  created_at timestamptz not null default now()
);

create index lead_feedback_organization_id_idx on public.lead_feedback (organization_id);
create index lead_feedback_lead_id_idx on public.lead_feedback (lead_id);

-- ---------------------------------------------------------------------------
-- updated_at automatisch pflegen
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger agents_set_updated_at before update on public.agents
  for each row execute function public.set_updated_at();
create trigger search_profiles_set_updated_at before update on public.search_profiles
  for each row execute function public.set_updated_at();
create trigger leads_set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Mandanten-Helper + Registrierungsfunktion
-- ---------------------------------------------------------------------------

-- Liefert die organization_id des aktuell eingeloggten Benutzers.
-- SECURITY DEFINER, damit RLS-Policies (die diese Funktion aufrufen) keine
-- rekursive RLS-Auswertung auf profiles auslösen.
create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where user_id = auth.uid() limit 1;
$$;

grant execute on function public.current_organization_id() to authenticated;

-- Wird direkt nach der Registrierung einmalig vom Client aufgerufen:
-- legt Organisation + Profil in einer Transaktion an. Läuft als
-- SECURITY DEFINER, weil organizations/profiles sonst keine Insert-Policy
-- für authentifizierte Nutzer haben (bewusst, siehe RLS unten).
create or replace function public.create_organization_and_profile(p_org_name text, p_full_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_agent_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet.';
  end if;

  if exists (select 1 from public.profiles where user_id = auth.uid()) then
    raise exception 'Für diesen Benutzer existiert bereits ein Profil.';
  end if;

  insert into public.organizations (name) values (p_org_name)
  returning id into v_org_id;

  insert into public.profiles (user_id, organization_id, full_name, email)
  values (
    auth.uid(),
    v_org_id,
    p_full_name,
    coalesce((select email from auth.users where id = auth.uid()), '')
  );

  insert into public.agents (organization_id, name, agent_type, description)
  values (
    v_org_id,
    'Lead Scout',
    'lead_scout',
    'Dein digitaler Mitarbeiter für die Suche nach passenden Zielkunden.'
  )
  returning id into v_agent_id;

  insert into public.search_profiles (organization_id, agent_id)
  values (v_org_id, v_agent_id);

  return v_org_id;
end;
$$;

grant execute on function public.create_organization_and_profile(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.agents enable row level security;
alter table public.search_profiles enable row level security;
alter table public.leads enable row level security;
alter table public.agent_runs enable row level security;
alter table public.lead_feedback enable row level security;

-- organizations: nur lesen/aktualisieren der eigenen Organisation.
-- Insert bewusst nicht erlaubt (nur via create_organization_and_profile).
create policy organizations_select on public.organizations
  for select using (id = public.current_organization_id());
create policy organizations_update on public.organizations
  for update using (id = public.current_organization_id());

-- profiles: eigene Organisation lesen, eigenes Profil aktualisieren.
create policy profiles_select on public.profiles
  for select using (organization_id = public.current_organization_id());
create policy profiles_update_own on public.profiles
  for update using (user_id = auth.uid());

-- agents
create policy agents_select on public.agents
  for select using (organization_id = public.current_organization_id());
create policy agents_insert on public.agents
  for insert with check (organization_id = public.current_organization_id());
create policy agents_update on public.agents
  for update using (organization_id = public.current_organization_id());
create policy agents_delete on public.agents
  for delete using (organization_id = public.current_organization_id());

-- search_profiles
create policy search_profiles_select on public.search_profiles
  for select using (organization_id = public.current_organization_id());
create policy search_profiles_insert on public.search_profiles
  for insert with check (organization_id = public.current_organization_id());
create policy search_profiles_update on public.search_profiles
  for update using (organization_id = public.current_organization_id());
create policy search_profiles_delete on public.search_profiles
  for delete using (organization_id = public.current_organization_id());

-- leads
create policy leads_select on public.leads
  for select using (organization_id = public.current_organization_id());
create policy leads_insert on public.leads
  for insert with check (organization_id = public.current_organization_id());
create policy leads_update on public.leads
  for update using (organization_id = public.current_organization_id());

-- agent_runs
create policy agent_runs_select on public.agent_runs
  for select using (organization_id = public.current_organization_id());
create policy agent_runs_insert on public.agent_runs
  for insert with check (organization_id = public.current_organization_id());
create policy agent_runs_update on public.agent_runs
  for update using (organization_id = public.current_organization_id());

-- lead_feedback
create policy lead_feedback_select on public.lead_feedback
  for select using (organization_id = public.current_organization_id());
create policy lead_feedback_insert on public.lead_feedback
  for insert with check (
    organization_id = public.current_organization_id()
    and user_id = auth.uid()
  );
