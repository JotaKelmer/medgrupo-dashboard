-- =========================================================
-- EXTENSÕES
-- =========================================================
create extension if not exists "pgcrypto";

-- =========================================================
-- ENUMS
-- =========================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'platform_type') then
    create type platform_type as enum ('meta', 'google');
  end if;
end $$;

-- =========================================================
-- UPDATED_AT AUTOMÁTICO
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- WORKSPACES / CONTAS DE NEGÓCIO
-- Conta lógica do dashboard, acima das contas Meta/Google
-- =========================================================
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  primary_color text not null default '#D9EB1A',
  secondary_color text not null default '#489696',
  accent_color text not null default '#8E1AEB',
  background_color text not null default '#121616',
  timezone text not null default 'America/Sao_Paulo',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_workspaces_updated_at on public.workspaces;
create trigger trg_workspaces_updated_at
before update on public.workspaces
for each row
execute function public.set_updated_at();

create index if not exists idx_workspaces_active on public.workspaces(is_active);

-- =========================================================
-- CONTAS DE ANÚNCIO / CONEXÕES
-- =========================================================
create table if not exists public.ad_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  platform platform_type not null,
  external_id text not null,
  name text not null,
  currency text not null default 'BRL',
  timezone text not null default 'America/Sao_Paulo',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ad_accounts_external_unique unique (workspace_id, platform, external_id)
);

drop trigger if exists trg_ad_accounts_updated_at on public.ad_accounts;
create trigger trg_ad_accounts_updated_at
before update on public.ad_accounts
for each row
execute function public.set_updated_at();

create index if not exists idx_ad_accounts_workspace_id on public.ad_accounts(workspace_id);
create index if not exists idx_ad_accounts_platform on public.ad_accounts(platform);

-- =========================================================
-- CAMPANHAS
-- =========================================================
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ad_account_id uuid not null references public.ad_accounts(id) on delete cascade,
  platform platform_type not null,
  external_id text not null,
  name text not null,
  objective text,
  status text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint campaigns_external_unique unique (ad_account_id, external_id)
);

drop trigger if exists trg_campaigns_updated_at on public.campaigns;
create trigger trg_campaigns_updated_at
before update on public.campaigns
for each row
execute function public.set_updated_at();

create index if not exists idx_campaigns_workspace_id on public.campaigns(workspace_id);
create index if not exists idx_campaigns_account_id on public.campaigns(ad_account_id);
create index if not exists idx_campaigns_platform on public.campaigns(platform);

-- =========================================================
-- CONJUNTOS
-- =========================================================
create table if not exists public.ad_sets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  external_id text not null,
  name text not null,
  status text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ad_sets_external_unique unique (campaign_id, external_id)
);

drop trigger if exists trg_ad_sets_updated_at on public.ad_sets;
create trigger trg_ad_sets_updated_at
before update on public.ad_sets
for each row
execute function public.set_updated_at();

create index if not exists idx_ad_sets_campaign_id on public.ad_sets(campaign_id);

-- =========================================================
-- ANÚNCIOS / CRIATIVOS
-- =========================================================
create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  ad_set_id uuid not null references public.ad_sets(id) on delete cascade,
  external_id text not null,
  name text not null,
  creative_name text,
  status text,
  preview_url text,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ads_external_unique unique (ad_set_id, external_id)
);

drop trigger if exists trg_ads_updated_at on public.ads;
create trigger trg_ads_updated_at
before update on public.ads
for each row
execute function public.set_updated_at();

create index if not exists idx_ads_ad_set_id on public.ads(ad_set_id);

-- =========================================================
-- MÉTRICAS DIÁRIAS
-- Base principal do dashboard
-- =========================================================
create table if not exists public.daily_metrics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ad_account_id uuid not null references public.ad_accounts(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  ad_set_id uuid references public.ad_sets(id) on delete set null,
  ad_id uuid references public.ads(id) on delete set null,

  platform platform_type not null,
  metric_date date not null,

  impressions integer not null default 0,
  reach integer not null default 0,
  clicks integer not null default 0,
  link_clicks integer not null default 0,
  landing_page_views integer not null default 0,
  messages_started integer not null default 0,
  engagements integer not null default 0,
  leads integer not null default 0,
  checkouts integer not null default 0,
  purchases integer not null default 0,

  results integer not null default 0,
  result_label text not null default 'Resultado',

  spend numeric(14,2) not null default 0,
  revenue numeric(14,2) not null default 0,

  video_views_25 integer not null default 0,
  video_views_50 integer not null default 0,
  video_views_75 integer not null default 0,
  video_views_100 integer not null default 0,

  ctr numeric(10,4) not null default 0,
  cpm numeric(14,4) not null default 0,
  cpc numeric(14,4) not null default 0,
  cost_per_result numeric(14,4) not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_daily_metrics_updated_at on public.daily_metrics;
create trigger trg_daily_metrics_updated_at
before update on public.daily_metrics
for each row
execute function public.set_updated_at();

create unique index if not exists idx_daily_metrics_unique_row
on public.daily_metrics (
  workspace_id,
  ad_account_id,
  platform,
  metric_date,
  coalesce(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(ad_set_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(ad_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

create index if not exists idx_daily_metrics_workspace_date on public.daily_metrics(workspace_id, metric_date);
create index if not exists idx_daily_metrics_campaign_date on public.daily_metrics(campaign_id, metric_date);
create index if not exists idx_daily_metrics_platform_date on public.daily_metrics(platform, metric_date);

-- =========================================================
-- MÉTRICAS DEMOGRÁFICAS
-- =========================================================
create table if not exists public.demographic_metrics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ad_account_id uuid not null references public.ad_accounts(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  ad_set_id uuid references public.ad_sets(id) on delete set null,
  ad_id uuid references public.ads(id) on delete set null,

  platform platform_type not null,
  metric_date date not null,

  age_range text not null,
  gender text,

  impressions integer not null default 0,
  clicks integer not null default 0,
  link_clicks integer not null default 0,
  results integer not null default 0,
  spend numeric(14,2) not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_demographic_metrics_updated_at on public.demographic_metrics;
create trigger trg_demographic_metrics_updated_at
before update on public.demographic_metrics
for each row
execute function public.set_updated_at();

create unique index if not exists idx_demographic_metrics_unique_row
on public.demographic_metrics (
  workspace_id,
  ad_account_id,
  platform,
  metric_date,
  coalesce(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(ad_set_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(ad_id, '00000000-0000-0000-0000-000000000000'::uuid),
  age_range,
  coalesce(gender, 'all')
);

create index if not exists idx_demographic_metrics_workspace_date on public.demographic_metrics(workspace_id, metric_date);

-- =========================================================
-- FILTROS SALVOS
-- =========================================================
create table if not exists public.dashboard_saved_filters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  view_type text not null check (view_type in ('geral', 'verba', 'controle')),
  start_date date,
  end_date date,
  campaign_id uuid references public.campaigns(id) on delete set null,
  platform platform_type,
  funnel_id uuid,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_dashboard_saved_filters_updated_at on public.dashboard_saved_filters;
create trigger trg_dashboard_saved_filters_updated_at
before update on public.dashboard_saved_filters
for each row
execute function public.set_updated_at();

create index if not exists idx_dashboard_saved_filters_user_workspace on public.dashboard_saved_filters(user_id, workspace_id);

-- =========================================================
-- PLANEJAMENTO DE VERBA
-- =========================================================
create table if not exists public.budget_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null default 'Plano de verba',
  period_days integer not null check (period_days > 0),
  total_budget numeric(14,2) not null check (total_budget >= 0),
  start_date date,
  end_date date,
  notes text,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_budget_plans_updated_at on public.budget_plans;
create trigger trg_budget_plans_updated_at
before update on public.budget_plans
for each row
execute function public.set_updated_at();

create index if not exists idx_budget_plans_workspace_id on public.budget_plans(workspace_id);

create table if not exists public.budget_channel_distribution (
  id uuid primary key default gen_random_uuid(),
  budget_plan_id uuid not null references public.budget_plans(id) on delete cascade,
  platform platform_type not null,
  percentage numeric(8,4) not null check (percentage >= 0 and percentage <= 100),
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint budget_channel_distribution_unique unique (budget_plan_id, platform)
);

drop trigger if exists trg_budget_channel_distribution_updated_at on public.budget_channel_distribution;
create trigger trg_budget_channel_distribution_updated_at
before update on public.budget_channel_distribution
for each row
execute function public.set_updated_at();

create table if not exists public.budget_objective_distribution (
  id uuid primary key default gen_random_uuid(),
  budget_plan_id uuid not null references public.budget_plans(id) on delete cascade,
  platform platform_type not null,
  objective text not null,
  percentage numeric(8,4) not null check (percentage >= 0 and percentage <= 100),
  period_days integer not null check (period_days > 0),
  daily_budget numeric(14,2) not null check (daily_budget >= 0),
  total_budget numeric(14,2) not null check (total_budget >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint budget_objective_distribution_unique unique (budget_plan_id, platform, objective)
);

drop trigger if exists trg_budget_objective_distribution_updated_at on public.budget_objective_distribution;
create trigger trg_budget_objective_distribution_updated_at
before update on public.budget_objective_distribution
for each row
execute function public.set_updated_at();

create table if not exists public.channel_benchmarks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  platform platform_type not null,
  metric_key text not null,
  metric_label text not null,
  metric_value numeric(14,4) not null check (metric_value >= 0),
  source text default 'manual',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint channel_benchmarks_unique unique (workspace_id, platform, metric_key)
);

drop trigger if exists trg_channel_benchmarks_updated_at on public.channel_benchmarks;
create trigger trg_channel_benchmarks_updated_at
before update on public.channel_benchmarks
for each row
execute function public.set_updated_at();

create table if not exists public.budget_estimates (
  id uuid primary key default gen_random_uuid(),
  budget_plan_id uuid not null references public.budget_plans(id) on delete cascade,
  platform platform_type not null,
  metric_key text not null,
  metric_label text not null,
  daily_result numeric(14,4) not null default 0,
  total_result numeric(14,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint budget_estimates_unique unique (budget_plan_id, platform, metric_key)
);

drop trigger if exists trg_budget_estimates_updated_at on public.budget_estimates;
create trigger trg_budget_estimates_updated_at
before update on public.budget_estimates
for each row
execute function public.set_updated_at();

-- =========================================================
-- FUNIL TOTALMENTE CUSTOMIZÁVEL
-- =========================================================
create table if not exists public.funnels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  category text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_funnels_updated_at on public.funnels;
create trigger trg_funnels_updated_at
before update on public.funnels
for each row
execute function public.set_updated_at();

create index if not exists idx_funnels_workspace_id on public.funnels(workspace_id);

create table if not exists public.funnel_steps (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  step_key text not null,
  step_label text not null,
  step_order integer not null,
  source_type text not null default 'standard' check (source_type in ('standard', 'custom')),
  metric_source text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint funnel_steps_unique_key unique (funnel_id, step_key),
  constraint funnel_steps_unique_order unique (funnel_id, step_order)
);

drop trigger if exists trg_funnel_steps_updated_at on public.funnel_steps;
create trigger trg_funnel_steps_updated_at
before update on public.funnel_steps
for each row
execute function public.set_updated_at();

create index if not exists idx_funnel_steps_funnel_id on public.funnel_steps(funnel_id);

create table if not exists public.custom_metric_definitions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  metric_key text not null,
  metric_label text not null,
  description text,
  data_type text not null default 'number',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint custom_metric_definitions_unique unique (workspace_id, metric_key)
);

drop trigger if exists trg_custom_metric_definitions_updated_at on public.custom_metric_definitions;
create trigger trg_custom_metric_definitions_updated_at
before update on public.custom_metric_definitions
for each row
execute function public.set_updated_at();

create table if not exists public.custom_metric_values (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  ad_set_id uuid references public.ad_sets(id) on delete set null,
  ad_id uuid references public.ads(id) on delete set null,
  metric_definition_id uuid not null references public.custom_metric_definitions(id) on delete cascade,
  metric_date date not null,
  metric_value numeric(14,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_custom_metric_values_updated_at on public.custom_metric_values;
create trigger trg_custom_metric_values_updated_at
before update on public.custom_metric_values
for each row
execute function public.set_updated_at();

create unique index if not exists idx_custom_metric_values_unique_row
on public.custom_metric_values (
  workspace_id,
  metric_definition_id,
  metric_date,
  coalesce(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(ad_set_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(ad_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

create table if not exists public.funnel_step_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  funnel_step_id uuid not null references public.funnel_steps(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  ad_set_id uuid references public.ad_sets(id) on delete set null,
  ad_id uuid references public.ads(id) on delete set null,
  platform platform_type,
  metric_date date not null,
  step_value numeric(14,4) not null default 0,
  conversion_rate numeric(10,4),
  step_cost numeric(14,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_funnel_step_snapshots_updated_at on public.funnel_step_snapshots;
create trigger trg_funnel_step_snapshots_updated_at
before update on public.funnel_step_snapshots
for each row
execute function public.set_updated_at();

create index if not exists idx_funnel_step_snapshots_funnel_date on public.funnel_step_snapshots(funnel_id, metric_date);

-- =========================================================
-- SAÚDE DOS CRIATIVOS
-- =========================================================
create table if not exists public.creative_frequency_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade unique,
  good_max numeric(10,4) not null default 6,
  attention_max numeric(10,4) not null default 10,
  replace_max numeric(10,4) not null default 15,
  critical_max numeric(10,4) not null default 18,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_creative_frequency_rules_updated_at on public.creative_frequency_rules;
create trigger trg_creative_frequency_rules_updated_at
before update on public.creative_frequency_rules
for each row
execute function public.set_updated_at();

create table if not exists public.creative_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  ad_set_id uuid references public.ad_sets(id) on delete set null,
  ad_id uuid references public.ads(id) on delete set null,
  platform platform_type not null,
  metric_date date not null,

  impressions integer not null default 0,
  reach integer not null default 0,
  frequency numeric(10,4) not null default 0,
  ctr numeric(10,4) not null default 0,
  spend numeric(14,2) not null default 0,
  results integer not null default 0,
  cost_per_result numeric(14,4) not null default 0,

  health_status text,
  recommendation text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_creative_health_snapshots_updated_at on public.creative_health_snapshots;
create trigger trg_creative_health_snapshots_updated_at
before update on public.creative_health_snapshots
for each row
execute function public.set_updated_at();

create unique index if not exists idx_creative_health_snapshots_unique_row
on public.creative_health_snapshots (
  workspace_id,
  platform,
  metric_date,
  coalesce(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(ad_set_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(ad_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- =========================================================
-- LOGS OPERACIONAIS / SINCRONIZAÇÃO
-- =========================================================
create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  platform platform_type not null,
  status text not null check (status in ('ok', 'warning', 'error', 'running')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  inserted_rows integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_sync_runs_updated_at on public.sync_runs;
create trigger trg_sync_runs_updated_at
before update on public.sync_runs
for each row
execute function public.set_updated_at();

create index if not exists idx_sync_runs_workspace_started on public.sync_runs(workspace_id, started_at desc);

-- =========================================================
-- VIEWS
-- =========================================================
create or replace view public.v_daily_kpis as
select
  dm.workspace_id,
  dm.platform,
  dm.metric_date,
  sum(dm.impressions) as impressions,
  sum(dm.reach) as reach,
  sum(dm.clicks) as clicks,
  sum(dm.link_clicks) as link_clicks,
  sum(dm.landing_page_views) as landing_page_views,
  sum(dm.messages_started) as messages_started,
  sum(dm.engagements) as engagements,
  sum(dm.leads) as leads,
  sum(dm.checkouts) as checkouts,
  sum(dm.purchases) as purchases,
  sum(dm.results) as results,
  max(dm.result_label) as result_label,
  sum(dm.spend) as spend,
  sum(dm.revenue) as revenue,
  case
    when sum(dm.impressions) > 0 then (sum(dm.clicks)::numeric / sum(dm.impressions)::numeric) * 100
    else 0
  end as ctr,
  case
    when sum(dm.impressions) > 0 then (sum(dm.spend)::numeric / sum(dm.impressions)::numeric) * 1000
    else 0
  end as cpm,
  case
    when sum(dm.clicks) > 0 then sum(dm.spend)::numeric / sum(dm.clicks)::numeric
    else 0
  end as cpc,
  case
    when sum(dm.results) > 0 then sum(dm.spend)::numeric / sum(dm.results)::numeric
    else 0
  end as cost_per_result
from public.daily_metrics dm
group by dm.workspace_id, dm.platform, dm.metric_date;

create or replace view public.v_budget_plan_summary as
select
  bp.id as budget_plan_id,
  bp.workspace_id,
  bp.name,
  bp.period_days,
  bp.total_budget,
  bp.start_date,
  bp.end_date,
  coalesce(sum(case when bcd.platform = 'meta' then bcd.amount else 0 end), 0) as meta_budget,
  coalesce(sum(case when bcd.platform = 'google' then bcd.amount else 0 end), 0) as google_budget,
  bp.created_at,
  bp.updated_at
from public.budget_plans bp
left join public.budget_channel_distribution bcd
  on bcd.budget_plan_id = bp.id
group by bp.id, bp.workspace_id, bp.name, bp.period_days, bp.total_budget, bp.start_date, bp.end_date, bp.created_at, bp.updated_at;

-- =========================================================
-- RLS
-- Desligado nesta versão para acelerar a implementação.
-- Depois, o próximo passo é ligar auth + policies por workspace.
-- =========================================================
