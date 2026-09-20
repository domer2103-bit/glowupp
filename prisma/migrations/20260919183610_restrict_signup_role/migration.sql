-- Security fix (Phase 12 review): the previous version of this trigger
-- cast `raw_user_meta_data->>'role'` directly to the "UserRole" enum with
-- no whitelist. `raw_user_meta_data` is fully attacker-controlled — the
-- Next.js signup action's Zod schema (src/lib/actions/auth.ts) only
-- allows HOMEOWNER/PROFESSIONAL, but that validation is bypassed entirely
-- by anyone calling `supabase.auth.signUp()` directly with the public
-- anon key (e.g. from browser devtools), which is a normal, expected way
-- to use that API. That meant any anonymous visitor could self-register
-- with `role: "ADMIN"` and, via this trigger, get a real
-- public.users.role = 'ADMIN' row — which src/lib/data/projects.ts's
-- getProject() and this same migration's RLS policies (is_admin()) both
-- already trust to grant read access to every homeowner's projects,
-- photos, requirements, and design concepts.
--
-- Fix: only ever accept HOMEOWNER or PROFESSIONAL from signup metadata.
-- Anything else (ADMIN, a typo, an empty string, garbage) silently falls
-- back to HOMEOWNER. There is deliberately no way to self-register as
-- ADMIN — that role must be granted by a trusted, out-of-band process
-- (e.g. directly in the database), never through public signup.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_role text := new.raw_user_meta_data->>'role';
  safe_role "UserRole";
begin
  if requested_role in ('HOMEOWNER', 'PROFESSIONAL') then
    safe_role := requested_role::"UserRole";
  else
    safe_role := 'HOMEOWNER';
  end if;

  insert into public.users (id, role, name, email, postcode, updated_at)
  values (
    new.id,
    safe_role,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    nullif(new.raw_user_meta_data->>'postcode', ''),
    now()
  );
  return new;
end;
$$;
