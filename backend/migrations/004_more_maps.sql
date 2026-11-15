-- 004_more_maps: the smoke-days and haze trend maps (GET /maps/smoke_days and /maps/aod) are stored like the other
-- three. Without this the seed's writes for them fail the check and the backend serves them from files.

alter table public.trend_fields drop constraint if exists trend_fields_factor_check;
alter table public.trend_fields add constraint trend_fields_factor_check
  check (factor in ('pm25', 'no2', 'fires', 'smoke_days', 'aod'));
