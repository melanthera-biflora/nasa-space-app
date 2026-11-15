-- 001_init: what Climatch stores (SPEC amendment A1). NASA grids stay in files; Postgres keeps what the app computes,
-- so repeat reports are instant and teammates share one cache. Only the backend's own connection reads or writes:
-- row-level security is on with no policies, and the browser roles get no grants.

create table if not exists public.report_cache (
  key         text primary key,                      -- lat,lon|conditions|age groups|period|version (services/reports.py)
  lat         numeric(5, 2) not null,
  lon         numeric(6, 2) not null,
  conditions  text[] not null,
  age_groups  text[] not null,
  period      smallint not null check (period in (10, 15, 20, 25)),
  version     text not null,                         -- thresholds_version/DATA_VERSION: a new one never reuses old rows
  report      jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists report_cache_point on public.report_cache (lat, lon);
comment on table public.report_cache is 'Complete reports by point, household, period and version (backend/services/reports.py).';

create table if not exists public.place_cache (
  kind        text not null check (kind in ('geocode', 'suggest')),
  query       text not null,                         -- lower-case, single-spaced
  places      jsonb not null,
  created_at  timestamptz not null default now(),
  primary key (kind, query)
);
comment on table public.place_cache is 'Address search (Nominatim) and suggestion (Photon) results, so each query is asked once.';

create table if not exists public.trend_fields (
  factor        text primary key check (factor in ('pm25', 'no2', 'fires')),
  data_version  text not null,
  field         jsonb not null,
  built_at      timestamptz not null default now()
);
comment on table public.trend_fields is 'The US map field per factor, as built by data_pipeline/tools/trend_field.py.';

create table if not exists public.datasets (
  name        text primary key,                      -- e.g. pm25_merra2, no2_omi, fires_firms, power
  source      text not null,
  version     text,
  first_year  smallint,
  last_year   smallint,
  built_at    timestamptz,
  notes       text
);
comment on table public.datasets is 'Which NASA source and version built the stored artifacts.';

alter table public.report_cache enable row level security;
alter table public.place_cache  enable row level security;
alter table public.trend_fields enable row level security;
alter table public.datasets     enable row level security;

revoke all on public.report_cache, public.place_cache, public.trend_fields, public.datasets from anon, authenticated;
