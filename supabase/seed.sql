-- =========================================================
-- SEED MEDGRUPO
-- =========================================================
insert into public.workspaces (
  id, name, slug, primary_color, secondary_color, accent_color, background_color, timezone, is_active
)
values (
  '11111111-1111-1111-1111-111111111111',
  'MEDGRUPO',
  'medgrupo',
  '#D9EB1A',
  '#489696',
  '#8E1AEB',
  '#121616',
  'America/Sao_Paulo',
  true
)
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  primary_color = excluded.primary_color,
  secondary_color = excluded.secondary_color,
  accent_color = excluded.accent_color,
  background_color = excluded.background_color,
  timezone = excluded.timezone,
  is_active = excluded.is_active;

insert into public.ad_accounts (id, workspace_id, platform, external_id, name, currency, timezone, is_active)
values
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'meta', 'meta-123456', 'MEDGRUPO | Meta Ads', 'BRL', 'America/Sao_Paulo', true),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'google', 'google-987654', 'MEDGRUPO | Google Ads', 'BRL', 'America/Sao_Paulo', true)
on conflict (workspace_id, platform, external_id) do update
set
  name = excluded.name,
  currency = excluded.currency,
  timezone = excluded.timezone,
  is_active = excluded.is_active;

insert into public.campaigns (id, workspace_id, ad_account_id, platform, external_id, name, objective, status, is_active)
values
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'meta', 'cmp-meta-1', 'Vestibular | Captação', 'Cadastros', 'ACTIVE', true),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'meta', 'cmp-meta-2', 'Always On | WhatsApp', 'Mensagens', 'ACTIVE', true),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'google', 'cmp-google-1', 'Search Brand | Leads', 'Cadastros', 'ACTIVE', true)
on conflict (ad_account_id, external_id) do update
set
  name = excluded.name,
  objective = excluded.objective,
  status = excluded.status,
  is_active = excluded.is_active;

insert into public.ad_sets (id, campaign_id, external_id, name, status)
values
  ('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333331', 'adset-meta-1', 'Interesses | Medicina', 'ACTIVE'),
  ('44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333332', 'adset-meta-2', 'Remarketing | Vídeo', 'ACTIVE'),
  ('44444444-4444-4444-4444-444444444443', '33333333-3333-3333-3333-333333333333', 'adset-google-1', 'Search | Brand', 'ACTIVE')
on conflict (campaign_id, external_id) do update
set
  name = excluded.name,
  status = excluded.status;

insert into public.ads (id, ad_set_id, external_id, name, creative_name, status)
values
  ('55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', 'ad-meta-1', 'Criativo A | Aprovação', 'Vídeo A', 'ACTIVE'),
  ('55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444441', 'ad-meta-2', 'Criativo B | Depoimento', 'Vídeo B', 'ACTIVE'),
  ('55555555-5555-5555-5555-555555555553', '44444444-4444-4444-4444-444444444442', 'ad-meta-3', 'Criativo C | WhatsApp', 'Imagem C', 'ACTIVE'),
  ('55555555-5555-5555-5555-555555555554', '44444444-4444-4444-4444-444444444443', 'ad-google-1', 'Search Brand | Headline 1', 'RSA 1', 'ACTIVE')
on conflict (ad_set_id, external_id) do update
set
  name = excluded.name,
  creative_name = excluded.creative_name,
  status = excluded.status;

insert into public.custom_metric_definitions (
  id, workspace_id, metric_key, metric_label, description, data_type, is_active
)
values (
  '66666666-6666-6666-6666-666666666661',
  '11111111-1111-1111-1111-111111111111',
  'qualified_leads',
  'Leads Qualificados',
  'Lead que passou por qualificação comercial',
  'number',
  true
)
on conflict (workspace_id, metric_key) do update
set
  metric_label = excluded.metric_label,
  description = excluded.description,
  data_type = excluded.data_type,
  is_active = excluded.is_active;

insert into public.creative_frequency_rules (
  id, workspace_id, good_max, attention_max, replace_max, critical_max
)
values (
  '77777777-7777-7777-7777-777777777771',
  '11111111-1111-1111-1111-111111111111',
  6, 10, 15, 18
)
on conflict (workspace_id) do update
set
  good_max = excluded.good_max,
  attention_max = excluded.attention_max,
  replace_max = excluded.replace_max,
  critical_max = excluded.critical_max;

insert into public.funnels (id, workspace_id, name, description, category, is_default, is_active)
values
  ('88888888-8888-8888-8888-888888888881', '11111111-1111-1111-1111-111111111111', 'Funil de Vendas', 'Jornada completa até compra', 'vendas', true, true),
  ('88888888-8888-8888-8888-888888888882', '11111111-1111-1111-1111-111111111111', 'Retenção de Vídeo', 'Consumo de vídeo por marcos', 'video', false, true),
  ('88888888-8888-8888-8888-888888888883', '11111111-1111-1111-1111-111111111111', 'WhatsApp Comercial', 'Da impressão ao lead qualificado', 'whatsapp', false, true)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  is_default = excluded.is_default,
  is_active = excluded.is_active;

delete from public.funnel_steps
where funnel_id in (
  '88888888-8888-8888-8888-888888888881',
  '88888888-8888-8888-8888-888888888882',
  '88888888-8888-8888-8888-888888888883'
);

insert into public.funnel_steps (
  id, funnel_id, step_key, step_label, step_order, source_type, metric_source, is_active
)
values
  ('99999999-9999-9999-9999-999999999911', '88888888-8888-8888-8888-888888888881', 'impressions', 'Impressões', 1, 'standard', 'impressions', true),
  ('99999999-9999-9999-9999-999999999912', '88888888-8888-8888-8888-888888888881', 'clicks', 'Cliques', 2, 'standard', 'link_clicks', true),
  ('99999999-9999-9999-9999-999999999913', '88888888-8888-8888-8888-888888888881', 'lpv', 'LPV', 3, 'standard', 'landing_page_views', true),
  ('99999999-9999-9999-9999-999999999914', '88888888-8888-8888-8888-888888888881', 'leads', 'Leads', 4, 'standard', 'leads', true),
  ('99999999-9999-9999-9999-999999999915', '88888888-8888-8888-8888-888888888881', 'purchases', 'Compras', 5, 'standard', 'purchases', true),

  ('99999999-9999-9999-9999-999999999921', '88888888-8888-8888-8888-888888888882', 'vv25', 'VV 25%', 1, 'standard', 'video_views_25', true),
  ('99999999-9999-9999-9999-999999999922', '88888888-8888-8888-8888-888888888882', 'vv50', 'VV 50%', 2, 'standard', 'video_views_50', true),
  ('99999999-9999-9999-9999-999999999923', '88888888-8888-8888-8888-888888888882', 'vv75', 'VV 75%', 3, 'standard', 'video_views_75', true),
  ('99999999-9999-9999-9999-999999999924', '88888888-8888-8888-8888-888888888882', 'vv100', 'VV 100%', 4, 'standard', 'video_views_100', true),

  ('99999999-9999-9999-9999-999999999931', '88888888-8888-8888-8888-888888888883', 'impressions', 'Impressões', 1, 'standard', 'impressions', true),
  ('99999999-9999-9999-9999-999999999932', '88888888-8888-8888-8888-888888888883', 'clicks', 'Cliques no link', 2, 'standard', 'link_clicks', true),
  ('99999999-9999-9999-9999-999999999933', '88888888-8888-8888-8888-888888888883', 'messages', 'Conversas iniciadas', 3, 'standard', 'messages_started', true),
  ('99999999-9999-9999-9999-999999999934', '88888888-8888-8888-8888-888888888883', 'qualified_leads', 'Leads qualificados', 4, 'custom', 'qualified_leads', true);

insert into public.budget_plans (
  id, workspace_id, name, period_days, total_budget, notes, is_active
)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  '11111111-1111-1111-1111-111111111111',
  'Plano principal | Março',
  30,
  30000,
  'Plano base para aquisição e remarketing.',
  true
)
on conflict (id) do update
set
  name = excluded.name,
  period_days = excluded.period_days,
  total_budget = excluded.total_budget,
  notes = excluded.notes,
  is_active = excluded.is_active;

insert into public.budget_channel_distribution (budget_plan_id, platform, percentage, amount)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'meta', 67, 20100),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'google', 33, 9900)
on conflict (budget_plan_id, platform) do update
set
  percentage = excluded.percentage,
  amount = excluded.amount;

insert into public.budget_objective_distribution (
  budget_plan_id, platform, objective, percentage, period_days, daily_budget, total_budget, sort_order
)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'meta', 'Reconhecimento', 15, 30, 100.50, 3015.00, 1),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'meta', 'Tráfego', 20, 30, 134.00, 4020.00, 2),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'meta', 'Engajamento', 15, 30, 100.50, 3015.00, 3),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'meta', 'Cadastros', 20, 30, 134.00, 4020.00, 4),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'meta', 'Vendas', 30, 30, 201.00, 6030.00, 5),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'google', 'Reconhecimento', 10, 30, 33.00, 990.00, 1),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'google', 'Tráfego', 30, 30, 99.00, 2970.00, 2),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'google', 'Engajamento', 10, 30, 33.00, 990.00, 3),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'google', 'Cadastros', 20, 30, 66.00, 1980.00, 4),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'google', 'Vendas', 30, 30, 99.00, 2970.00, 5)
on conflict (budget_plan_id, platform, objective) do update
set
  percentage = excluded.percentage,
  period_days = excluded.period_days,
  daily_budget = excluded.daily_budget,
  total_budget = excluded.total_budget,
  sort_order = excluded.sort_order;

insert into public.channel_benchmarks (
  workspace_id, platform, metric_key, metric_label, metric_value, source, is_active
)
values
  ('11111111-1111-1111-1111-111111111111', 'meta', 'cpm', 'CPM', 40.0, 'manual', true),
  ('11111111-1111-1111-1111-111111111111', 'meta', 'cost_per_visit', 'Custo por Visita', 1.5, 'manual', true),
  ('11111111-1111-1111-1111-111111111111', 'meta', 'cost_per_engagement', 'Custo por Engajamento', 1.2, 'manual', true),
  ('11111111-1111-1111-1111-111111111111', 'meta', 'cost_per_lead', 'Custo por Lead', 12.0, 'manual', true),
  ('11111111-1111-1111-1111-111111111111', 'meta', 'cost_per_sale', 'Custo por Venda', 80.0, 'manual', true),
  ('11111111-1111-1111-1111-111111111111', 'google', 'cpm', 'CPM', 35.0, 'manual', true),
  ('11111111-1111-1111-1111-111111111111', 'google', 'cost_per_visit', 'Custo por Visita', 2.2, 'manual', true),
  ('11111111-1111-1111-1111-111111111111', 'google', 'cost_per_engagement', 'Custo por Engajamento', 1.8, 'manual', true),
  ('11111111-1111-1111-1111-111111111111', 'google', 'cost_per_lead', 'Custo por Lead', 15.0, 'manual', true),
  ('11111111-1111-1111-1111-111111111111', 'google', 'cost_per_sale', 'Custo por Venda', 95.0, 'manual', true)
on conflict (workspace_id, platform, metric_key) do update
set
  metric_label = excluded.metric_label,
  metric_value = excluded.metric_value,
  source = excluded.source,
  is_active = excluded.is_active;

insert into public.budget_estimates (
  budget_plan_id, platform, metric_key, metric_label, daily_result, total_result
)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'meta', 'impressions', 'Impressões', 16750, 502500),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'meta', 'visits', 'Visitas', 447, 13400),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'meta', 'engagements', 'Engajamentos', 558, 16750),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'meta', 'leads', 'Leads', 56, 1675),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'meta', 'sales', 'Vendas', 8.37, 251.25),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'google', 'impressions', 'Impressões', 9428, 282857),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'google', 'visits', 'Visitas', 150, 4500),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'google', 'engagements', 'Engajamentos', 183.33, 5500),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'google', 'leads', 'Leads', 22, 660),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'google', 'sales', 'Vendas', 3.47, 104.21)
on conflict (budget_plan_id, platform, metric_key) do update
set
  metric_label = excluded.metric_label,
  daily_result = excluded.daily_result,
  total_result = excluded.total_result;

insert into public.sync_runs (
  id, workspace_id, platform, status, started_at, finished_at, inserted_rows, error_message, metadata
)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '11111111-1111-1111-1111-111111111111', 'meta', 'ok', now() - interval '2 hours', now() - interval '1 hour 58 minutes', 3200, null, '{"source":"meta api"}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '11111111-1111-1111-1111-111111111111', 'google', 'error', now() - interval '90 minutes', now() - interval '87 minutes', 1180, 'Timeout na conta de pesquisa. Reexecutar a sincronização.', '{"source":"google api"}')
on conflict (id) do update
set
  platform = excluded.platform,
  status = excluded.status,
  started_at = excluded.started_at,
  finished_at = excluded.finished_at,
  inserted_rows = excluded.inserted_rows,
  error_message = excluded.error_message,
  metadata = excluded.metadata;

with dates as (
  select
    gs as day_index,
    (current_date - interval '29 day' + (gs || ' day')::interval)::date as metric_date
  from generate_series(0, 29) as gs
),
ads_config as (
  select *
  from (
    values
      ('55555555-5555-5555-5555-555555555551'::uuid, '44444444-4444-4444-4444-444444444441'::uuid, '33333333-3333-3333-3333-333333333331'::uuid, '22222222-2222-2222-2222-222222222221'::uuid, 'meta'::platform_type, 'Leads'::text, 4600::numeric, 410::numeric, 0.017::numeric, 0.003::numeric, 0.008::numeric, false),
      ('55555555-5555-5555-5555-555555555552'::uuid, '44444444-4444-4444-4444-444444444441'::uuid, '33333333-3333-3333-3333-333333333331'::uuid, '22222222-2222-2222-2222-222222222221'::uuid, 'meta'::platform_type, 'Leads'::text, 5020::numeric, 462::numeric, 0.0108::numeric, 0.007::numeric, 0.018::numeric, false),
      ('55555555-5555-5555-5555-555555555553'::uuid, '44444444-4444-4444-4444-444444444442'::uuid, '33333333-3333-3333-3333-333333333332'::uuid, '22222222-2222-2222-2222-222222222221'::uuid, 'meta'::platform_type, 'Mensagens'::text, 5440::numeric, 514::numeric, 0.0132::numeric, 0.012::numeric, 0.030::numeric, true),
      ('55555555-5555-5555-5555-555555555554'::uuid, '44444444-4444-4444-4444-444444444443'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'google'::platform_type, 'Leads'::text, 3740::numeric, 464::numeric, 0.026::numeric, 0.004::numeric, 0.010::numeric, false)
  ) as t(ad_id, ad_set_id, campaign_id, ad_account_id, platform, result_label, base_impressions, base_spend, ctr_base, ctr_decay, fatigue_step, is_whatsapp)
),
metrics_base as (
  select
    gen_random_uuid() as id,
    '11111111-1111-1111-1111-111111111111'::uuid as workspace_id,
    c.ad_account_id,
    c.campaign_id,
    c.ad_set_id,
    c.ad_id,
    c.platform,
    d.metric_date,
    round(c.base_impressions * case when extract(isodow from d.metric_date) in (2, 3) then 1.14 else 1 end)::integer as impressions,
    greatest(
      round(
        (c.base_impressions * case when extract(isodow from d.metric_date) in (2, 3) then 1.14 else 1 end)
        / (1 + (d.day_index * c.fatigue_step))
      )::integer,
      1
    ) as reach,
    greatest(
      round(
        (
          c.base_impressions * case when extract(isodow from d.metric_date) in (2, 3) then 1.14 else 1 end
        ) * greatest(c.ctr_base * (1 - (d.day_index * c.ctr_decay)), case when c.platform = 'google' then 0.016 else 0.007 end)
      )::integer,
      1
    ) as clicks,
    round(c.base_spend * (case when extract(isodow from d.metric_date) in (2, 3) then 1.14 else 1 end) * (1 + (d.day_index * 0.012)), 2) as spend,
    c.result_label,
    c.is_whatsapp
  from dates d
  cross join ads_config c
),
metrics_final as (
  select
    id,
    workspace_id,
    ad_account_id,
    campaign_id,
    ad_set_id,
    ad_id,
    platform,
    metric_date,
    impressions,
    reach,
    clicks,
    round(clicks * case when platform = 'google' then 0.92 else 0.78 end)::integer as link_clicks,
    round((round(clicks * case when platform = 'google' then 0.92 else 0.78 end)::integer) * case when platform = 'google' then 0.74 else 0.61 end)::integer as landing_page_views,
    case when is_whatsapp then round((round(clicks * 0.78)::integer) * 0.18)::integer else 0 end as messages_started,
    round(clicks * case when platform = 'meta' then 1.6 else 1.2 end)::integer as engagements,
    case
      when is_whatsapp then round((round((round(clicks * 0.78)::integer) * 0.18)::integer) * 0.34)::integer
      else round((round((round(clicks * case when platform = 'google' then 0.92 else 0.78 end)::integer) * case when platform = 'google' then 0.74 else 0.61 end)::integer) * case when platform = 'google' then 0.16 else 0.12 end)::integer
    end as leads,
    spend,
    result_label
  from metrics_base
)
insert into public.daily_metrics (
  id, workspace_id, ad_account_id, campaign_id, ad_set_id, ad_id, platform, metric_date,
  impressions, reach, clicks, link_clicks, landing_page_views, messages_started,
  engagements, leads, checkouts, purchases, results, result_label, spend, revenue,
  video_views_25, video_views_50, video_views_75, video_views_100,
  ctr, cpm, cpc, cost_per_result
)
select
  mf.id,
  mf.workspace_id,
  mf.ad_account_id,
  mf.campaign_id,
  mf.ad_set_id,
  mf.ad_id,
  mf.platform,
  mf.metric_date,
  mf.impressions,
  mf.reach,
  mf.clicks,
  mf.link_clicks,
  mf.landing_page_views,
  mf.messages_started,
  mf.engagements,
  mf.leads,
  round(mf.leads * 0.44)::integer as checkouts,
  case
    when mf.is_whatsapp then round(mf.leads * 0.18)::integer
    else round((round(mf.leads * 0.44)::integer) * 0.31)::integer
  end as purchases,
  case when mf.is_whatsapp then mf.messages_started else mf.leads end as results,
  mf.result_label,
  mf.spend,
  round(
    (
      case
        when mf.is_whatsapp then round(mf.leads * 0.18)::integer
        else round((round(mf.leads * 0.44)::integer) * 0.31)::integer
      end
    ) * 1200
    + (mf.leads * 160),
    2
  ) as revenue,
  case when mf.platform = 'meta' then round(mf.impressions * 0.38)::integer else 0 end as video_views_25,
  case when mf.platform = 'meta' then round((round(mf.impressions * 0.38)::integer) * 0.65)::integer else 0 end as video_views_50,
  case when mf.platform = 'meta' then round((round((round(mf.impressions * 0.38)::integer) * 0.65)::integer) * 0.58)::integer else 0 end as video_views_75,
  case when mf.platform = 'meta' then round((round((round((round(mf.impressions * 0.38)::integer) * 0.65)::integer) * 0.58)::integer) * 0.44)::integer else 0 end as video_views_100,
  round(case when mf.impressions > 0 then (mf.clicks::numeric / mf.impressions::numeric) * 100 else 0 end, 4) as ctr,
  round(case when mf.impressions > 0 then (mf.spend::numeric / mf.impressions::numeric) * 1000 else 0 end, 4) as cpm,
  round(case when mf.clicks > 0 then mf.spend::numeric / mf.clicks::numeric else 0 end, 4) as cpc,
  round(case when (case when mf.is_whatsapp then mf.messages_started else mf.leads end) > 0 then mf.spend::numeric / (case when mf.is_whatsapp then mf.messages_started else mf.leads end)::numeric else 0 end, 4) as cost_per_result
from metrics_final mf
on conflict do nothing;

insert into public.demographic_metrics (
  id, workspace_id, ad_account_id, campaign_id, ad_set_id, ad_id, platform, metric_date,
  age_range, gender, impressions, clicks, link_clicks, results, spend
)
select
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222221'::uuid,
  null,
  null,
  null,
  'meta'::platform_type,
  dm.metric_date,
  age_bucket.age_range,
  null,
  round(sum(dm.impressions) * age_bucket.share)::integer,
  round(sum(dm.clicks) * age_bucket.share)::integer,
  round(sum(dm.link_clicks) * age_bucket.share)::integer,
  round(sum(dm.results) * age_bucket.share)::integer,
  round(sum(dm.spend) * age_bucket.share, 2)
from public.daily_metrics dm
cross join (
  values
    ('18-24'::text, 0.22::numeric),
    ('25-34'::text, 0.42::numeric),
    ('35-44'::text, 0.20::numeric),
    ('45-54'::text, 0.10::numeric),
    ('55+'::text, 0.06::numeric)
) as age_bucket(age_range, share)
where dm.workspace_id = '11111111-1111-1111-1111-111111111111'
group by dm.metric_date, age_bucket.age_range, age_bucket.share
on conflict do nothing;

insert into public.custom_metric_values (
  id, workspace_id, campaign_id, ad_set_id, ad_id, metric_definition_id, metric_date, metric_value
)
select
  gen_random_uuid(),
  dm.workspace_id,
  dm.campaign_id,
  dm.ad_set_id,
  dm.ad_id,
  '66666666-6666-6666-6666-666666666661'::uuid,
  dm.metric_date,
  round(dm.messages_started * 0.46, 4)
from public.daily_metrics dm
where dm.workspace_id = '11111111-1111-1111-1111-111111111111'
  and dm.campaign_id = '33333333-3333-3333-3333-333333333332'
on conflict do nothing;

insert into public.creative_health_snapshots (
  id, workspace_id, campaign_id, ad_set_id, ad_id, platform, metric_date,
  impressions, reach, frequency, ctr, spend, results, cost_per_result, health_status, recommendation
)
select
  gen_random_uuid(),
  dm.workspace_id,
  dm.campaign_id,
  dm.ad_set_id,
  dm.ad_id,
  dm.platform,
  dm.metric_date,
  dm.impressions,
  dm.reach,
  round(case when dm.reach > 0 then dm.impressions::numeric / dm.reach::numeric else 0 end, 4),
  dm.ctr,
  dm.spend,
  dm.results,
  dm.cost_per_result,
  case
    when (case when dm.reach > 0 then dm.impressions::numeric / dm.reach::numeric else 0 end) >= 18 then 'critical'
    when (case when dm.reach > 0 then dm.impressions::numeric / dm.reach::numeric else 0 end) >= 15 then 'replace'
    when (case when dm.reach > 0 then dm.impressions::numeric / dm.reach::numeric else 0 end) >= 10 then 'warning'
    else 'good'
  end,
  case
    when (case when dm.reach > 0 then dm.impressions::numeric / dm.reach::numeric else 0 end) >= 18 then 'Saturação evidente. Trocar a peça e revisar ângulo/copy.'
    when (case when dm.reach > 0 then dm.impressions::numeric / dm.reach::numeric else 0 end) >= 15 then 'Frequência alta com perda de eficiência. Substituir o criativo.'
    when (case when dm.reach > 0 then dm.impressions::numeric / dm.reach::numeric else 0 end) >= 10 then 'Criativo pedindo atenção. Monitorar e preparar nova variação.'
    else 'Frequência controlada e performance sustentável.'
  end
from public.daily_metrics dm
where dm.workspace_id = '11111111-1111-1111-1111-111111111111'
on conflict do nothing;
