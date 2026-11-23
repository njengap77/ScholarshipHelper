-- 0002_profile_trigger_and_extras.sql
-- Completes auth-driven profile creation, user preferences defaults, feedback, ai usage, and updated_at triggers.

-- 1. Trigger handle_new_user() on auth.users insert
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (user_id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Add extra profile fields needed by onboarding steps 2, 4 and eligibility engine
alter table public.profiles add column if not exists highest_completed_level text check (highest_completed_level in ('highschool','diploma','bachelor','master','phd'));
alter table public.profiles add column if not exists skills text[] default '{}';
alter table public.profiles add column if not exists research_interests text[] default '{}';
alter table public.profiles add column if not exists certifications text[] default '{}';
alter table public.profiles add column if not exists extracurriculars text[] default '{}';
alter table public.profiles add column if not exists languages text[] default '{}';

-- 3. Unique index on notifications to stop duplicate alerts
create unique index if not exists idx_notifications_dedupe on public.notifications (
  user_id,
  type,
  (payload->>'opportunity_id'),
  (payload->>'threshold')
);

-- 4. User feedback table for "report inaccurate/outdated" and "report suspicious"
create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  opportunity_id uuid references public.opportunities on delete set null,
  kind text not null check (kind in ('inaccurate','outdated','suspicious','other')),
  message text not null,
  status text not null default 'pending' check (status in ('pending','reviewed','resolved','dismissed')),
  created_at timestamptz default now()
);

alter table public.user_feedback enable row level security;
create policy "users can insert own feedback" on public.user_feedback
  for insert with check (auth.uid() = user_id);
create policy "users can view own feedback" on public.user_feedback
  for select using (auth.uid() = user_id or is_admin());
create policy "admins can manage feedback" on public.user_feedback
  for all using (is_admin()) with check (is_admin());

-- 5. AI usage tracking table
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  feature text not null,
  model text not null,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  cost_usd numeric not null default 0,
  created_at timestamptz default now()
);

alter table public.ai_usage enable row level security;
create policy "users can view own ai usage" on public.ai_usage
  for select using (auth.uid() = user_id or is_admin());

-- 6. Trigger for updated_at on opportunities
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_opportunities_updated_at on public.opportunities;
create trigger set_opportunities_updated_at
  before update on public.opportunities
  for each row execute function public.update_updated_at_column();

-- 7. Permissions grants for postgrest roles
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on routines to anon, authenticated, service_role;
