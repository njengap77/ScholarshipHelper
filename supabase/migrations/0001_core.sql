-- Phase 1 core schema. Run in Supabase SQL editor or via `supabase db push`.
create extension if not exists vector;
create extension if not exists pg_trgm;

create table profiles (
  user_id uuid primary key references auth.users on delete cascade,
  full_name text, country_residence text, nationalities text[] not null default '{}',
  dob date, onboarding_completed_at timestamptz, created_at timestamptz default now()
);
create table academic_backgrounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  level text not null check (level in ('highschool','diploma','bachelor','master','phd')),
  institution text, field text, specialization text,
  grade_value numeric, grade_scale text, grade_normalized numeric check (grade_normalized between 0 and 4),
  graduation_year int, expected_graduation date, created_at timestamptz default now()
);
create table user_preferences (
  user_id uuid primary key references auth.users on delete cascade,
  study_levels text[] default '{}', fields text[] default '{}', countries text[] default '{}',
  opp_types text[] default '{}', funding_needs text check (funding_needs in ('full','partial','tuition_only','self')),
  can_pay_fees bool, can_pay_travel bool, relocate bool, formats text[] default '{}',
  notif_prefs jsonb not null default '{"in_app":true,"email":true,"telegram":false}'
);

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null, ror_id text unique, official_domains text[] default '{}', country text
);
create table sources (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('web','rss','api','telegram','manual')),
  url text, status text not null default 'active', config jsonb default '{}', last_run_at timestamptz
);
create table raw_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources, url text, content_hash text unique not null,
  body_text text, meta jsonb default '{}', fetched_at timestamptz default now()
);
create table opportunities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations,
  category text not null, title text not null, summary text, country text,
  degree_levels text[] default '{}', fields text[] default '{}',
  funding_type text check (funding_type in ('full','partial','tuition_only','none','unknown')),
  funding_details jsonb default '{}', deadline date, start_date date, duration_months int,
  application_fee numeric, delivery_format text, official_url text, source_url text,
  status text not null default 'pending_review' check (status in ('pending_review','published','flagged','expired')),
  dedupe_key text, embedding vector(1536),
  discovered_at timestamptz default now(), last_verified_at timestamptz, updated_at timestamptz default now()
);
create index on opportunities using gin (degree_levels);
create index on opportunities using gin (fields);
create index on opportunities (deadline) where status = 'published';
create index on opportunities using gin (title gin_trgm_ops);
create index on opportunities using hnsw (embedding vector_cosine_ops);

create table opportunity_sources (
  opportunity_id uuid references opportunities on delete cascade,
  raw_document_id uuid references raw_documents, source_type text,
  primary key (opportunity_id, raw_document_id)
);
create table eligibility_criteria (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities on delete cascade,
  kind text not null check (kind in ('nationality','min_grade','age','experience','language','degree_required')),
  operator text not null check (operator in ('in','not_in','gte','lte','between','eq')),
  value jsonb not null, source_quote text, confidence numeric not null default 1 check (confidence between 0 and 1)
);
create table required_documents (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities on delete cascade, name text not null, notes text
);
create table verification_reports (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities on delete cascade,
  status text not null check (status in ('verified','needs_confirmation','unverified','suspicious','potential_scam','expired')),
  summary text, checked_at timestamptz default now()
);
create table verification_checks (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references verification_reports on delete cascade,
  check_type text not null, result text not null check (result in ('pass','fail','unknown')),
  evidence_url text, detail text
);

create table matches (
  user_id uuid references auth.users on delete cascade,
  opportunity_id uuid references opportunities on delete cascade,
  score numeric check (score between 0 and 100),
  eligibility_status text not null check (eligibility_status in ('eligible','potentially_eligible','not_eligible','insufficient_information')),
  criteria_results jsonb not null default '[]', computed_at timestamptz default now(),
  primary key (user_id, opportunity_id)
);
create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  opportunity_id uuid not null references opportunities on delete cascade,
  status text not null default 'saved' check (status in ('discovered','saved','considering','eligibility_checked',
    'preparing_documents','in_progress','ready','submitted','interview','accepted','rejected','withdrawn')),
  notes text, submitted_at timestamptz, outcome_at timestamptz, created_at timestamptz default now(),
  unique (user_id, opportunity_id)
);
create table application_tasks (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications on delete cascade,
  title text not null, due_date date, done_at timestamptz
);
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type text not null, payload jsonb default '{}', channel text default 'in_app', read_at timestamptz, created_at timestamptz default now()
);
create table admin_roles (user_id uuid primary key references auth.users on delete cascade, role text not null check (role in ('admin','reviewer')));
create table audit_log (
  id bigserial primary key, actor_id uuid, action text not null, entity text, entity_id text, diff jsonb, at timestamptz default now()
);

-- ===== Row-Level Security =====
create function is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from admin_roles where user_id = auth.uid()) $$;

do $$ declare t text; begin
  foreach t in array array['profiles','academic_backgrounds','user_preferences','matches','applications','notifications'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "owner all" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
-- matches are computed server-side only: owners may read, not write
drop policy "owner all" on matches;
create policy "owner read" on matches for select using (user_id = auth.uid());

alter table application_tasks enable row level security;
create policy "owner all" on application_tasks for all
  using (exists (select 1 from applications a where a.id = application_id and a.user_id = auth.uid()))
  with check (exists (select 1 from applications a where a.id = application_id and a.user_id = auth.uid()));

-- Public catalogue: anyone signed in reads published rows; writes only via service role / admin
do $$ declare t text; begin
  foreach t in array array['opportunities','eligibility_criteria','required_documents','verification_reports','verification_checks','organizations','opportunity_sources'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
create policy "read published" on opportunities for select using (status = 'published' or is_admin());
create policy "admin write" on opportunities for all using (is_admin()) with check (is_admin());
create policy "read orgs" on organizations for select using (true);
create policy "read criteria" on eligibility_criteria for select using (exists (select 1 from opportunities o where o.id = opportunity_id and o.status = 'published') or is_admin());
create policy "read docs" on required_documents for select using (exists (select 1 from opportunities o where o.id = opportunity_id and o.status = 'published') or is_admin());
create policy "read reports" on verification_reports for select using (exists (select 1 from opportunities o where o.id = opportunity_id and o.status = 'published') or is_admin());
create policy "read checks" on verification_checks for select using (exists (select 1 from verification_reports r join opportunities o on o.id = r.opportunity_id where r.id = report_id and o.status = 'published') or is_admin());
-- internal tables: RLS on, no policies = service role only (admin reads via server routes)
alter table sources enable row level security; alter table raw_documents enable row level security;
alter table admin_roles enable row level security; alter table audit_log enable row level security;
create policy "admin read audit" on audit_log for select using (is_admin());
