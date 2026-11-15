-- 002_region_series: state averages (SPEC amendment A2). One row per state, variable, period and version, holding the
-- same card the report uses (jsonb), so a state is fetched from NASA POWER once and then shared. Backend-only, like 001.

create table if not exists public.region_series (
  key           text primary key,                    -- code|variable|period|version (services/regions.py)
  code          text not null,                       -- US state or DC/PR postal code
  variable      text not null,                       -- t2m, t2m_max, precip, gwetroot, frost_days, pm25, no2
  period        smallint not null check (period between 8 and 45),
  version       text not null,
  body          jsonb not null,
  created_at    timestamptz not null default now()
);
create index if not exists region_series_code on public.region_series (code, variable);
comment on table public.region_series is 'State-average series and their trend tests (data_pipeline build_region).';

alter table public.region_series enable row level security;
revoke all on public.region_series from anon, authenticated;
