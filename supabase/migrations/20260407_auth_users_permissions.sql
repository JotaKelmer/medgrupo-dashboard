-- =========================================================
-- AUTH / USUÁRIOS / PERMISSÕES / RLS
-- =========================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('owner', 'admin', 'manager', 'analyst', 'viewer');
  end if;

  if not exists (select 1 from pg_type where typname = 'workspace_member_status') then
    create type public.workspace_member_status as enum ('invited', 'active', 'suspended', 'removed');
  end if;

  if not exists (select 1 from pg_type where typname = 'app_module') then
    create type public.app_module as enum (
      'geral',
      'inteligencia_operacional',
      'excelencia_comercial',
      'verbas',
      'plano_midia'
    );
  end if;
end $$;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

create unique index if not exists idx_user_profiles_email_unique
  on public.user_profiles (lower(email));

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'viewer',
  status public.workspace_member_status not null default 'invited',
  mfa_required boolean not null default false,
  is_primary boolean not null default false,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_members_unique_user unique (workspace_id, user_id)
);

drop trigger if exists trg_workspace_members_updated_at on public.workspace_members;
create trigger trg_workspace_members_updated_at
before update on public.workspace_members
for each row
execute function public.set_updated_at();

create index if not exists idx_workspace_members_workspace_status
  on public.workspace_members (workspace_id, status);

create index if not exists idx_workspace_members_user_status
  on public.workspace_members (user_id, status);

create table if not exists public.workspace_member_permissions (
  workspace_member_id uuid not null references public.workspace_members(id) on delete cascade,
  module public.app_module not null,
  can_view boolean not null default false,
  can_edit boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_member_id, module),
  constraint workspace_member_permissions_edit_requires_view
    check (can_edit = false or can_view = true)
);

drop trigger if exists trg_workspace_member_permissions_updated_at on public.workspace_member_permissions;
create trigger trg_workspace_member_permissions_updated_at
before update on public.workspace_member_permissions
for each row
execute function public.set_updated_at();

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_workspace_created
  on public.audit_logs (workspace_id, created_at desc);

create index if not exists idx_audit_logs_target_user
  on public.audit_logs (target_user_id);

create or replace function public.sync_user_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, full_name, is_active)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    true
  )
  on conflict (id)
  do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.user_profiles.full_name),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_profile_sync on auth.users;
create trigger on_auth_user_profile_sync
after insert or update of email, raw_user_meta_data on auth.users
for each row
execute function public.sync_user_profile_from_auth();

insert into public.user_profiles (id, email, full_name, is_active)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(coalesce(u.email, ''), '@', 1)
  ) as full_name,
  true
from auth.users u
on conflict (id)
do update set
  email = excluded.email,
  full_name = coalesce(public.user_profiles.full_name, excluded.full_name),
  updated_at = now();

create or replace function public.default_permission_flags(
  role public.app_role,
  module public.app_module
)
returns table (can_view boolean, can_edit boolean)
language sql
immutable
as $$
  select
    true as can_view,
    case
      when role in ('owner', 'admin', 'manager') then true
      when role = 'analyst' and module in ('geral', 'inteligencia_operacional') then true
      else false
    end as can_edit;
$$;

create or replace function public.seed_workspace_member_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  module_name public.app_module;
  flags record;
begin
  foreach module_name in array enum_range(null::public.app_module)
  loop
    select * into flags
    from public.default_permission_flags(new.role, module_name);

    insert into public.workspace_member_permissions (
      workspace_member_id,
      module,
      can_view,
      can_edit
    )
    values (
      new.id,
      module_name,
      flags.can_view,
      flags.can_edit
    )
    on conflict (workspace_member_id, module) do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_workspace_members_seed_permissions on public.workspace_members;
create trigger trg_workspace_members_seed_permissions
after insert on public.workspace_members
for each row
execute function public.seed_workspace_member_permissions();

create or replace function public.enforce_workspace_user_limit()
returns trigger
language plpgsql
as $$
declare
  workspace_user_count integer;
begin
  if new.status not in ('invited', 'active') then
    return new;
  end if;

  select count(*)
    into workspace_user_count
  from public.workspace_members wm
  where wm.workspace_id = new.workspace_id
    and wm.status in ('invited', 'active')
    and (tg_op <> 'UPDATE' or wm.id <> new.id);

  if workspace_user_count >= 10 then
    raise exception 'Limite de 10 usuários ativos/convidados atingido para este workspace.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_workspace_members_limit on public.workspace_members;
create trigger trg_workspace_members_limit
before insert or update of status, workspace_id on public.workspace_members
for each row
execute function public.enforce_workspace_user_limit();

create or replace function public.current_user_is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.status in ('active', 'invited')
  );
$$;

create or replace function public.current_user_can_manage_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.status in ('active', 'invited')
      and wm.role in ('owner', 'admin')
  );
$$;

create or replace function public.current_user_can_edit_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.status in ('active', 'invited')
      and wm.role in ('owner', 'admin', 'manager')
  );
$$;

grant execute on function public.current_user_is_workspace_member(uuid) to authenticated;
grant execute on function public.current_user_can_manage_workspace(uuid) to authenticated;
grant execute on function public.current_user_can_edit_workspace(uuid) to authenticated;
grant execute on function public.default_permission_flags(public.app_role, public.app_module) to authenticated;

alter table public.user_profiles enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_member_permissions enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "user_profiles_select_self" on public.user_profiles;
create policy "user_profiles_select_self"
on public.user_profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "user_profiles_update_self" on public.user_profiles;
create policy "user_profiles_update_self"
on public.user_profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "workspace_members_select_self_or_admin" on public.workspace_members;
create policy "workspace_members_select_self_or_admin"
on public.workspace_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_can_manage_workspace(workspace_id)
);

drop policy if exists "workspace_members_manage_admin" on public.workspace_members;
create policy "workspace_members_manage_admin"
on public.workspace_members
for all
to authenticated
using (public.current_user_can_manage_workspace(workspace_id))
with check (public.current_user_can_manage_workspace(workspace_id));

drop policy if exists "workspace_member_permissions_select_self_or_admin" on public.workspace_member_permissions;
create policy "workspace_member_permissions_select_self_or_admin"
on public.workspace_member_permissions
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.id = workspace_member_permissions.workspace_member_id
      and (
        wm.user_id = auth.uid()
        or public.current_user_can_manage_workspace(wm.workspace_id)
      )
  )
);

drop policy if exists "workspace_member_permissions_manage_admin" on public.workspace_member_permissions;
create policy "workspace_member_permissions_manage_admin"
on public.workspace_member_permissions
for all
to authenticated
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.id = workspace_member_permissions.workspace_member_id
      and public.current_user_can_manage_workspace(wm.workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.workspace_members wm
    where wm.id = workspace_member_permissions.workspace_member_id
      and public.current_user_can_manage_workspace(wm.workspace_id)
  )
);

drop policy if exists "audit_logs_admin_select" on public.audit_logs;
create policy "audit_logs_admin_select"
on public.audit_logs
for select
to authenticated
using (public.current_user_can_manage_workspace(workspace_id));

drop policy if exists "audit_logs_admin_insert" on public.audit_logs;
create policy "audit_logs_admin_insert"
on public.audit_logs
for insert
to authenticated
with check (public.current_user_can_manage_workspace(workspace_id));

alter table public.workspaces enable row level security;
alter table public.ad_accounts enable row level security;
alter table public.campaigns enable row level security;
alter table public.ad_sets enable row level security;
alter table public.ads enable row level security;
alter table public.daily_metrics enable row level security;
alter table public.demographic_metrics enable row level security;
alter table public.dashboard_saved_filters enable row level security;
alter table public.budget_plans enable row level security;
alter table public.budget_channel_distribution enable row level security;
alter table public.budget_objective_distribution enable row level security;
alter table public.channel_benchmarks enable row level security;
alter table public.budget_estimates enable row level security;
alter table public.funnels enable row level security;
alter table public.funnel_steps enable row level security;
alter table public.custom_metric_definitions enable row level security;
alter table public.custom_metric_values enable row level security;
alter table public.funnel_step_snapshots enable row level security;
alter table public.creative_frequency_rules enable row level security;
alter table public.creative_health_snapshots enable row level security;
alter table public.sync_runs enable row level security;

drop policy if exists "workspaces_select_member" on public.workspaces;
create policy "workspaces_select_member"
on public.workspaces
for select
to authenticated
using (public.current_user_is_workspace_member(id));

drop policy if exists "workspaces_update_editor" on public.workspaces;
create policy "workspaces_update_editor"
on public.workspaces
for update
to authenticated
using (public.current_user_can_edit_workspace(id))
with check (public.current_user_can_edit_workspace(id));

drop policy if exists "ad_accounts_member_select" on public.ad_accounts;
create policy "ad_accounts_member_select"
on public.ad_accounts
for select
to authenticated
using (public.current_user_is_workspace_member(workspace_id));

drop policy if exists "ad_accounts_editor_write" on public.ad_accounts;
create policy "ad_accounts_editor_write"
on public.ad_accounts
for all
to authenticated
using (public.current_user_can_edit_workspace(workspace_id))
with check (public.current_user_can_edit_workspace(workspace_id));

drop policy if exists "campaigns_member_select" on public.campaigns;
create policy "campaigns_member_select"
on public.campaigns
for select
to authenticated
using (public.current_user_is_workspace_member(workspace_id));

drop policy if exists "campaigns_editor_write" on public.campaigns;
create policy "campaigns_editor_write"
on public.campaigns
for all
to authenticated
using (public.current_user_can_edit_workspace(workspace_id))
with check (public.current_user_can_edit_workspace(workspace_id));

drop policy if exists "ad_sets_member_select" on public.ad_sets;
create policy "ad_sets_member_select"
on public.ad_sets
for select
to authenticated
using (
  exists (
    select 1
    from public.campaigns c
    where c.id = ad_sets.campaign_id
      and public.current_user_is_workspace_member(c.workspace_id)
  )
);

drop policy if exists "ad_sets_editor_write" on public.ad_sets;
create policy "ad_sets_editor_write"
on public.ad_sets
for all
to authenticated
using (
  exists (
    select 1
    from public.campaigns c
    where c.id = ad_sets.campaign_id
      and public.current_user_can_edit_workspace(c.workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.campaigns c
    where c.id = ad_sets.campaign_id
      and public.current_user_can_edit_workspace(c.workspace_id)
  )
);

drop policy if exists "ads_member_select" on public.ads;
create policy "ads_member_select"
on public.ads
for select
to authenticated
using (
  exists (
    select 1
    from public.ad_sets ads_sets
    join public.campaigns c on c.id = ads_sets.campaign_id
    where ads_sets.id = ads.ad_set_id
      and public.current_user_is_workspace_member(c.workspace_id)
  )
);

drop policy if exists "ads_editor_write" on public.ads;
create policy "ads_editor_write"
on public.ads
for all
to authenticated
using (
  exists (
    select 1
    from public.ad_sets ads_sets
    join public.campaigns c on c.id = ads_sets.campaign_id
    where ads_sets.id = ads.ad_set_id
      and public.current_user_can_edit_workspace(c.workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.ad_sets ads_sets
    join public.campaigns c on c.id = ads_sets.campaign_id
    where ads_sets.id = ads.ad_set_id
      and public.current_user_can_edit_workspace(c.workspace_id)
  )
);

drop policy if exists "daily_metrics_member_select" on public.daily_metrics;
create policy "daily_metrics_member_select"
on public.daily_metrics
for select
to authenticated
using (public.current_user_is_workspace_member(workspace_id));

drop policy if exists "daily_metrics_editor_write" on public.daily_metrics;
create policy "daily_metrics_editor_write"
on public.daily_metrics
for all
to authenticated
using (public.current_user_can_edit_workspace(workspace_id))
with check (public.current_user_can_edit_workspace(workspace_id));

drop policy if exists "demographic_metrics_member_select" on public.demographic_metrics;
create policy "demographic_metrics_member_select"
on public.demographic_metrics
for select
to authenticated
using (public.current_user_is_workspace_member(workspace_id));

drop policy if exists "demographic_metrics_editor_write" on public.demographic_metrics;
create policy "demographic_metrics_editor_write"
on public.demographic_metrics
for all
to authenticated
using (public.current_user_can_edit_workspace(workspace_id))
with check (public.current_user_can_edit_workspace(workspace_id));

drop policy if exists "dashboard_saved_filters_select" on public.dashboard_saved_filters;
create policy "dashboard_saved_filters_select"
on public.dashboard_saved_filters
for select
to authenticated
using (
  public.current_user_is_workspace_member(workspace_id)
  and (user_id = auth.uid() or public.current_user_can_manage_workspace(workspace_id))
);

drop policy if exists "dashboard_saved_filters_write" on public.dashboard_saved_filters;
create policy "dashboard_saved_filters_write"
on public.dashboard_saved_filters
for all
to authenticated
using (
  public.current_user_is_workspace_member(workspace_id)
  and user_id = auth.uid()
)
with check (
  public.current_user_is_workspace_member(workspace_id)
  and user_id = auth.uid()
);

drop policy if exists "budget_plans_member_select" on public.budget_plans;
create policy "budget_plans_member_select"
on public.budget_plans
for select
to authenticated
using (public.current_user_is_workspace_member(workspace_id));

drop policy if exists "budget_plans_editor_write" on public.budget_plans;
create policy "budget_plans_editor_write"
on public.budget_plans
for all
to authenticated
using (public.current_user_can_edit_workspace(workspace_id))
with check (public.current_user_can_edit_workspace(workspace_id));

drop policy if exists "budget_channel_distribution_member_access" on public.budget_channel_distribution;
create policy "budget_channel_distribution_member_access"
on public.budget_channel_distribution
for all
to authenticated
using (
  exists (
    select 1
    from public.budget_plans bp
    where bp.id = budget_channel_distribution.budget_plan_id
      and public.current_user_is_workspace_member(bp.workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.budget_plans bp
    where bp.id = budget_channel_distribution.budget_plan_id
      and public.current_user_can_edit_workspace(bp.workspace_id)
  )
);

drop policy if exists "budget_objective_distribution_member_access" on public.budget_objective_distribution;
create policy "budget_objective_distribution_member_access"
on public.budget_objective_distribution
for all
to authenticated
using (
  exists (
    select 1
    from public.budget_plans bp
    where bp.id = budget_objective_distribution.budget_plan_id
      and public.current_user_is_workspace_member(bp.workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.budget_plans bp
    where bp.id = budget_objective_distribution.budget_plan_id
      and public.current_user_can_edit_workspace(bp.workspace_id)
  )
);

drop policy if exists "channel_benchmarks_member_select" on public.channel_benchmarks;
create policy "channel_benchmarks_member_select"
on public.channel_benchmarks
for select
to authenticated
using (public.current_user_is_workspace_member(workspace_id));

drop policy if exists "channel_benchmarks_editor_write" on public.channel_benchmarks;
create policy "channel_benchmarks_editor_write"
on public.channel_benchmarks
for all
to authenticated
using (public.current_user_can_edit_workspace(workspace_id))
with check (public.current_user_can_edit_workspace(workspace_id));

drop policy if exists "budget_estimates_member_select" on public.budget_estimates;
create policy "budget_estimates_member_select"
on public.budget_estimates
for select
to authenticated
using (public.current_user_is_workspace_member(workspace_id));

drop policy if exists "budget_estimates_editor_write" on public.budget_estimates;
create policy "budget_estimates_editor_write"
on public.budget_estimates
for all
to authenticated
using (public.current_user_can_edit_workspace(workspace_id))
with check (public.current_user_can_edit_workspace(workspace_id));

drop policy if exists "funnels_member_select" on public.funnels;
create policy "funnels_member_select"
on public.funnels
for select
to authenticated
using (public.current_user_is_workspace_member(workspace_id));

drop policy if exists "funnels_editor_write" on public.funnels;
create policy "funnels_editor_write"
on public.funnels
for all
to authenticated
using (public.current_user_can_edit_workspace(workspace_id))
with check (public.current_user_can_edit_workspace(workspace_id));

drop policy if exists "funnel_steps_member_access" on public.funnel_steps;
create policy "funnel_steps_member_access"
on public.funnel_steps
for all
to authenticated
using (
  exists (
    select 1
    from public.funnels f
    where f.id = funnel_steps.funnel_id
      and public.current_user_is_workspace_member(f.workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.funnels f
    where f.id = funnel_steps.funnel_id
      and public.current_user_can_edit_workspace(f.workspace_id)
  )
);

drop policy if exists "custom_metric_definitions_member_select" on public.custom_metric_definitions;
create policy "custom_metric_definitions_member_select"
on public.custom_metric_definitions
for select
to authenticated
using (public.current_user_is_workspace_member(workspace_id));

drop policy if exists "custom_metric_definitions_editor_write" on public.custom_metric_definitions;
create policy "custom_metric_definitions_editor_write"
on public.custom_metric_definitions
for all
to authenticated
using (public.current_user_can_edit_workspace(workspace_id))
with check (public.current_user_can_edit_workspace(workspace_id));

drop policy if exists "custom_metric_values_member_access" on public.custom_metric_values;
create policy "custom_metric_values_member_access"
on public.custom_metric_values
for all
to authenticated
using (
  exists (
    select 1
    from public.custom_metric_definitions cmd
    where cmd.id = custom_metric_values.custom_metric_definition_id
      and public.current_user_is_workspace_member(cmd.workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.custom_metric_definitions cmd
    where cmd.id = custom_metric_values.custom_metric_definition_id
      and public.current_user_can_edit_workspace(cmd.workspace_id)
  )
);

drop policy if exists "funnel_step_snapshots_member_select" on public.funnel_step_snapshots;
create policy "funnel_step_snapshots_member_select"
on public.funnel_step_snapshots
for select
to authenticated
using (public.current_user_is_workspace_member(workspace_id));

drop policy if exists "funnel_step_snapshots_editor_write" on public.funnel_step_snapshots;
create policy "funnel_step_snapshots_editor_write"
on public.funnel_step_snapshots
for all
to authenticated
using (public.current_user_can_edit_workspace(workspace_id))
with check (public.current_user_can_edit_workspace(workspace_id));

drop policy if exists "creative_frequency_rules_member_select" on public.creative_frequency_rules;
create policy "creative_frequency_rules_member_select"
on public.creative_frequency_rules
for select
to authenticated
using (public.current_user_is_workspace_member(workspace_id));

drop policy if exists "creative_frequency_rules_editor_write" on public.creative_frequency_rules;
create policy "creative_frequency_rules_editor_write"
on public.creative_frequency_rules
for all
to authenticated
using (public.current_user_can_edit_workspace(workspace_id))
with check (public.current_user_can_edit_workspace(workspace_id));

drop policy if exists "creative_health_snapshots_member_select" on public.creative_health_snapshots;
create policy "creative_health_snapshots_member_select"
on public.creative_health_snapshots
for select
to authenticated
using (public.current_user_is_workspace_member(workspace_id));

drop policy if exists "creative_health_snapshots_editor_write" on public.creative_health_snapshots;
create policy "creative_health_snapshots_editor_write"
on public.creative_health_snapshots
for all
to authenticated
using (public.current_user_can_edit_workspace(workspace_id))
with check (public.current_user_can_edit_workspace(workspace_id));

drop policy if exists "sync_runs_member_select" on public.sync_runs;
create policy "sync_runs_member_select"
on public.sync_runs
for select
to authenticated
using (public.current_user_is_workspace_member(workspace_id));

drop policy if exists "sync_runs_editor_write" on public.sync_runs;
create policy "sync_runs_editor_write"
on public.sync_runs
for all
to authenticated
using (public.current_user_can_edit_workspace(workspace_id))
with check (public.current_user_can_edit_workspace(workspace_id));

-- Views continuam úteis para uso server-side. Se vocês quiserem expô-las diretamente no client,
-- o próximo passo é recriá-las com security_invoker e revisar políticas específicas.
