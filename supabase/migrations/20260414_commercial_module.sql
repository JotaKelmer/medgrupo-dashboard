create table if not exists public.commercial_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  metric_date date not null,
  owner_external_id text not null,
  owner_name text not null,
  owner_email text,
  total_open_deals integer not null default 0,
  deals_updated_this_month integer not null default 0,
  coverage_percent numeric(8,4) not null default 0,
  activities_done_yesterday integer not null default 0,
  activities_total_yesterday integer not null default 0,
  activities_overdue integer not null default 0,
  deals_advanced_yesterday integer not null default 0,
  deals_won_yesterday integer not null default 0,
  deals_lost_yesterday integer not null default 0,
  advancement_percent numeric(8,4) not null default 0,
  stagnant_deals integer not null default 0,
  stagnant_percent numeric(8,4) not null default 0,
  source text,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_daily_metrics_unique_row
    unique (workspace_id, metric_date, owner_external_id)
);

drop trigger if exists trg_commercial_daily_metrics_updated_at on public.commercial_daily_metrics;
create trigger trg_commercial_daily_metrics_updated_at
before update on public.commercial_daily_metrics
for each row
execute function public.set_updated_at();

create index if not exists idx_commercial_daily_metrics_workspace_date
  on public.commercial_daily_metrics (workspace_id, metric_date desc);

create index if not exists idx_commercial_daily_metrics_owner_date
  on public.commercial_daily_metrics (workspace_id, owner_external_id, metric_date desc);

create table if not exists public.commercial_weekly_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  owner_external_id text not null,
  owner_name text not null,
  owner_email text,
  score integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  source text,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_weekly_snapshots_unique_row
    unique (workspace_id, week_start, owner_external_id)
);

drop trigger if exists trg_commercial_weekly_snapshots_updated_at on public.commercial_weekly_snapshots;
create trigger trg_commercial_weekly_snapshots_updated_at
before update on public.commercial_weekly_snapshots
for each row
execute function public.set_updated_at();

create index if not exists idx_commercial_weekly_snapshots_workspace_week
  on public.commercial_weekly_snapshots (workspace_id, week_start desc);

create table if not exists public.commercial_feedbacks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_external_id text not null,
  owner_name text not null,
  period_start date not null,
  period_end date not null,
  ai_feedback text,
  manual_feedback text,
  author_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_feedbacks_unique_period
    unique (workspace_id, owner_external_id, period_start, period_end)
);

drop trigger if exists trg_commercial_feedbacks_updated_at on public.commercial_feedbacks;
create trigger trg_commercial_feedbacks_updated_at
before update on public.commercial_feedbacks
for each row
execute function public.set_updated_at();

create index if not exists idx_commercial_feedbacks_workspace_owner
  on public.commercial_feedbacks (workspace_id, owner_external_id, created_at desc);

create table if not exists public.commercial_sync_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  status text not null,
  source text not null default 'pipedrive',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  inserted_rows integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_commercial_sync_runs_updated_at on public.commercial_sync_runs;
create trigger trg_commercial_sync_runs_updated_at
before update on public.commercial_sync_runs
for each row
execute function public.set_updated_at();

create index if not exists idx_commercial_sync_runs_workspace_started
  on public.commercial_sync_runs (workspace_id, started_at desc);

alter table public.commercial_daily_metrics enable row level security;
alter table public.commercial_weekly_snapshots enable row level security;
alter table public.commercial_feedbacks enable row level security;
alter table public.commercial_sync_runs enable row level security;

drop policy if exists "commercial_daily_metrics_member_select" on public.commercial_daily_metrics;
create policy "commercial_daily_metrics_member_select"
on public.commercial_daily_metrics
for select
to authenticated
using (public.current_user_is_workspace_member(workspace_id));

drop policy if exists "commercial_daily_metrics_editor_write" on public.commercial_daily_metrics;
create policy "commercial_daily_metrics_editor_write"
on public.commercial_daily_metrics
for all
to authenticated
using (public.current_user_can_edit_workspace(workspace_id))
with check (public.current_user_can_edit_workspace(workspace_id));

drop policy if exists "commercial_weekly_snapshots_member_select" on public.commercial_weekly_snapshots;
create policy "commercial_weekly_snapshots_member_select"
on public.commercial_weekly_snapshots
for select
to authenticated
using (public.current_user_is_workspace_member(workspace_id));

drop policy if exists "commercial_weekly_snapshots_editor_write" on public.commercial_weekly_snapshots;
create policy "commercial_weekly_snapshots_editor_write"
on public.commercial_weekly_snapshots
for all
to authenticated
using (public.current_user_can_edit_workspace(workspace_id))
with check (public.current_user_can_edit_workspace(workspace_id));

drop policy if exists "commercial_feedbacks_member_select" on public.commercial_feedbacks;
create policy "commercial_feedbacks_member_select"
on public.commercial_feedbacks
for select
to authenticated
using (public.current_user_is_workspace_member(workspace_id));

drop policy if exists "commercial_feedbacks_editor_write" on public.commercial_feedbacks;
create policy "commercial_feedbacks_editor_write"
on public.commercial_feedbacks
for all
to authenticated
using (public.current_user_can_edit_workspace(workspace_id))
with check (public.current_user_can_edit_workspace(workspace_id));

drop policy if exists "commercial_sync_runs_member_select" on public.commercial_sync_runs;
create policy "commercial_sync_runs_member_select"
on public.commercial_sync_runs
for select
to authenticated
using (public.current_user_is_workspace_member(workspace_id));

drop policy if exists "commercial_sync_runs_editor_write" on public.commercial_sync_runs;
create policy "commercial_sync_runs_editor_write"
on public.commercial_sync_runs
for all
to authenticated
using (public.current_user_can_edit_workspace(workspace_id))
with check (public.current_user_can_edit_workspace(workspace_id));
