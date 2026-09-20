-- Auto-create a public.users row whenever someone signs up through
-- Supabase Auth. Reads role/name/postcode out of the signup call's
-- `options.data` (stored by Supabase as auth.users.raw_user_meta_data).
-- Defaults to HOMEOWNER if no role was supplied.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, role, name, email, postcode)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'HOMEOWNER')::"UserRole",
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    nullif(new.raw_user_meta_data->>'postcode', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security — defense in depth, not the primary access control.
--
-- The app talks to Postgres through Prisma using a single trusted
-- connection (the Supabase Session Pooler, authenticated as the `postgres`
-- role) — not through Supabase's per-user PostgREST/Data API. That means
-- these policies are NOT what stops one homeowner's query from reaching
-- another homeowner's row in normal app operation: that's enforced in
-- application code (src/lib/auth.ts's requireUser()/requireRole(), and
-- every server action scoping its `where` clause to the caller's id).
--
-- RLS still matters as a safety net: if the Supabase anon/authenticated
-- key is ever used directly from the browser (Storage policies, Realtime,
-- or a future direct-query path), these policies are what stands between
-- a signed-in user and someone else's data. Tables with no policy below
-- (e.g. activity_log) are fully locked to that access path by default —
-- RLS enabled with zero policies means deny-all, which is correct since
-- only server-side Prisma code is expected to touch that table.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'ADMIN'
  );
$$;

alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.project_photos enable row level security;
alter table public.project_requirements enable row level security;
alter table public.design_concepts enable row level security;
alter table public.professionals enable row level security;
alter table public.professional_services enable row level security;
alter table public.quote_requests enable row level security;
alter table public.activity_log enable row level security;

-- users: everyone can read/update their own row; admins read all
create policy "users_select_own" on public.users
  for select using (id = auth.uid() or public.is_admin());
create policy "users_update_own" on public.users
  for update using (id = auth.uid());

-- projects: homeowner owns theirs; a professional can see a project once
-- they've been sent a quote request for it; admin sees all
create policy "projects_select" on public.projects
  for select using (
    homeowner_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.quote_requests qr
      join public.professionals p on p.id = qr.professional_id
      where qr.project_id = projects.id and p.user_id = auth.uid()
    )
  );
create policy "projects_insert_own" on public.projects
  for insert with check (homeowner_id = auth.uid());
create policy "projects_update_own" on public.projects
  for update using (homeowner_id = auth.uid());
create policy "projects_delete_own" on public.projects
  for delete using (homeowner_id = auth.uid());

-- project_photos: readable by the owning homeowner or an authorized
-- professional; writable only by the owning homeowner
create policy "project_photos_select" on public.project_photos
  for select using (
    exists (select 1 from public.projects pr where pr.id = project_photos.project_id and (pr.homeowner_id = auth.uid() or public.is_admin()))
    or exists (
      select 1 from public.quote_requests qr
      join public.professionals p on p.id = qr.professional_id
      where qr.project_id = project_photos.project_id and p.user_id = auth.uid()
    )
  );
create policy "project_photos_write_own" on public.project_photos
  for all using (
    exists (select 1 from public.projects pr where pr.id = project_photos.project_id and pr.homeowner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects pr where pr.id = project_photos.project_id and pr.homeowner_id = auth.uid())
  );

-- project_requirements: same shape as project_photos
create policy "project_requirements_select" on public.project_requirements
  for select using (
    exists (select 1 from public.projects pr where pr.id = project_requirements.project_id and (pr.homeowner_id = auth.uid() or public.is_admin()))
    or exists (
      select 1 from public.quote_requests qr
      join public.professionals p on p.id = qr.professional_id
      where qr.project_id = project_requirements.project_id and p.user_id = auth.uid()
    )
  );
create policy "project_requirements_write_own" on public.project_requirements
  for all using (
    exists (select 1 from public.projects pr where pr.id = project_requirements.project_id and pr.homeowner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects pr where pr.id = project_requirements.project_id and pr.homeowner_id = auth.uid())
  );

-- design_concepts: same shape again
create policy "design_concepts_select" on public.design_concepts
  for select using (
    exists (select 1 from public.projects pr where pr.id = design_concepts.project_id and (pr.homeowner_id = auth.uid() or public.is_admin()))
    or exists (
      select 1 from public.quote_requests qr
      join public.professionals p on p.id = qr.professional_id
      where qr.project_id = design_concepts.project_id and p.user_id = auth.uid()
    )
  );
create policy "design_concepts_write_own" on public.design_concepts
  for all using (
    exists (select 1 from public.projects pr where pr.id = design_concepts.project_id and pr.homeowner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects pr where pr.id = design_concepts.project_id and pr.homeowner_id = auth.uid())
  );

-- professionals: any signed-in user can browse the directory (needed for
-- matching/quote requests); only the owning professional can write
create policy "professionals_select_authenticated" on public.professionals
  for select using (auth.role() = 'authenticated');
create policy "professionals_write_own" on public.professionals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "professional_services_select_authenticated" on public.professional_services
  for select using (auth.role() = 'authenticated');
create policy "professional_services_write_own" on public.professional_services
  for all using (
    exists (select 1 from public.professionals p where p.id = professional_services.professional_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.professionals p where p.id = professional_services.professional_id and p.user_id = auth.uid())
  );

-- quote_requests: homeowner sees their own, professional sees ones sent to
-- them, admin sees all
create policy "quote_requests_select" on public.quote_requests
  for select using (
    homeowner_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.professionals p where p.id = quote_requests.professional_id and p.user_id = auth.uid())
  );
create policy "quote_requests_insert_homeowner" on public.quote_requests
  for insert with check (homeowner_id = auth.uid());
create policy "quote_requests_update" on public.quote_requests
  for update using (
    homeowner_id = auth.uid()
    or exists (select 1 from public.professionals p where p.id = quote_requests.professional_id and p.user_id = auth.uid())
  );

-- activity_log: intentionally no policies — server-side Prisma access
-- only, RLS-enabled-with-no-policies means deny-all for any other path.
