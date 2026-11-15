-- 003_cleanup (D32, the owner's go-ahead on 2026-11-15, after the database review).
-- 1. Reports are stored household-neutral since A3 (D25), so these two columns were always empty. Dropping them means
--    the schema itself can no longer hold anyone's health conditions or ages.
-- 2. Two indexes no query used (every lookup goes by primary key): idx_scan was 0 for both.
-- 3. Place lookups (what people typed into the address box) now expire after 30 days: the store ignores older rows and
--    prunes them on each write (backend/store/postgres.py, PLACE_DAYS).

alter table public.report_cache
  drop column if exists conditions,
  drop column if exists age_groups;

drop index if exists public.report_cache_point;
drop index if exists public.region_series_code;

comment on table public.report_cache is 'Complete household-neutral reports by point, period and version (backend/services/reports.py).';
comment on table public.place_cache is 'Address search (Nominatim) and suggestion (Photon) results, kept 30 days so each query is asked once.';
