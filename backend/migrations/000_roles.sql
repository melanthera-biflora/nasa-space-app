-- 000_roles: the two browser roles Supabase has and a plain Postgres doesn't (anon, authenticated). 001 and 002 revoke
-- every grant from them, so a local database needs them to exist. On Supabase they already exist and this does nothing.

do $$
begin
  create role anon nologin;
exception when duplicate_object then null;
end $$;

do $$
begin
  create role authenticated nologin;
exception when duplicate_object then null;
end $$;
