-- Zusätzliche Lead-Quelle neben dem Lead Scout: SalesViewer (Website-Besucher-Erkennung).
-- Diese Leads sind keinem Agenten zugeordnet, daher wird agent_id optional.
alter table public.leads alter column agent_id drop not null;

alter table public.leads
  add column source text not null default 'lead_scout'
  check (source in ('lead_scout', 'salesviewer'));

create index leads_source_idx on public.leads (source);
