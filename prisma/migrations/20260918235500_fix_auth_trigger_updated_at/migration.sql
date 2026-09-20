-- Fix: `updated_at` has no database-level default (Prisma's @updatedAt is
-- enforced by Prisma Client at write time, not by Postgres), so the
-- trigger's plain INSERT was violating the NOT NULL constraint on that
-- column and every signup was failing with "Database error saving new
-- user". Set it explicitly.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, role, name, email, postcode, updated_at)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'HOMEOWNER')::"UserRole",
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    nullif(new.raw_user_meta_data->>'postcode', ''),
    now()
  );
  return new;
end;
$$;
