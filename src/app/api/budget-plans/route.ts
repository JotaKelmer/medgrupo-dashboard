import { NextResponse } from "next/server";
import { getSupabaseAdmin, shouldUseMocks } from "@/lib/supabase/admin";
import type { BudgetPlannerState } from "@/lib/dashboard/types";

export async function POST(request: Request) {
  const body = (await request.json()) as BudgetPlannerState;

  if (!body.workspaceId) {
    return NextResponse.json({ error: "workspaceId é obrigatório." }, { status: 400 });
  }

  if (shouldUseMocks()) {
    return NextResponse.json({ id: body.id ?? "mock-budget-plan" });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const planPayload = {
    workspace_id: body.workspaceId,
    name: body.name,
    period_days: body.periodDays,
    total_budget: body.totalBudget,
    start_date: body.startDate || null,
    end_date: body.endDate || null,
    notes: body.notes || null,
    is_active: true
  };

  const planResult = body.id
    ? await supabase.from("budget_plans").update(planPayload).eq("id", body.id).select("id").single()
    : await supabase.from("budget_plans").insert(planPayload).select("id").single();

  if (planResult.error || !planResult.data) {
    return NextResponse.json({ error: planResult.error?.message ?? "Falha ao salvar plano." }, { status: 500 });
  }

  const budgetPlanId = planResult.data.id;

  await Promise.all([
    supabase.from("budget_channel_distribution").delete().eq("budget_plan_id", budgetPlanId),
    supabase.from("budget_objective_distribution").delete().eq("budget_plan_id", budgetPlanId),
    supabase.from("budget_estimates").delete().eq("budget_plan_id", budgetPlanId)
  ]);

  const channelsPayload = body.channels.map((channel) => ({
    budget_plan_id: budgetPlanId,
    platform: channel.platform,
    percentage: channel.percentage,
    amount: channel.amount
  }));

  const objectivesPayload = body.objectives.map((objective, index) => ({
    budget_plan_id: budgetPlanId,
    platform: objective.platform,
    objective: objective.objective,
    percentage: objective.percentage,
    period_days: objective.periodDays,
    daily_budget: objective.dailyBudget,
    total_budget: objective.totalBudget,
    sort_order: index + 1
  }));

  const estimatesPayload = Object.entries(body.estimates).flatMap(([platform, metrics]) =>
    metrics.map((metric) => ({
      budget_plan_id: budgetPlanId,
      platform,
      metric_key: metric.metricKey,
      metric_label: metric.metricLabel,
      daily_result: metric.dailyResult,
      total_result: metric.totalResult
    }))
  );

  const benchmarkPayload = Object.entries(body.benchmarks).flatMap(([platform, benchmark]) => [
    {
      workspace_id: body.workspaceId,
      platform,
      metric_key: "cpm",
      metric_label: "CPM",
      metric_value: benchmark.cpm,
      source: "manual",
      is_active: true
    },
    {
      workspace_id: body.workspaceId,
      platform,
      metric_key: "cost_per_visit",
      metric_label: "Custo por Visita",
      metric_value: benchmark.costPerVisit,
      source: "manual",
      is_active: true
    },
    {
      workspace_id: body.workspaceId,
      platform,
      metric_key: "cost_per_engagement",
      metric_label: "Custo por Engajamento",
      metric_value: benchmark.costPerEngagement,
      source: "manual",
      is_active: true
    },
    {
      workspace_id: body.workspaceId,
      platform,
      metric_key: "cost_per_lead",
      metric_label: "Custo por Lead",
      metric_value: benchmark.costPerLead,
      source: "manual",
      is_active: true
    },
    {
      workspace_id: body.workspaceId,
      platform,
      metric_key: "cost_per_sale",
      metric_label: "Custo por Venda",
      metric_value: benchmark.costPerSale,
      source: "manual",
      is_active: true
    }
  ]);

  const [channelsResult, objectivesResult, estimatesResult, benchmarksResult] = await Promise.all([
    channelsPayload.length
      ? supabase.from("budget_channel_distribution").insert(channelsPayload)
      : Promise.resolve({ error: null }),
    objectivesPayload.length
      ? supabase.from("budget_objective_distribution").insert(objectivesPayload)
      : Promise.resolve({ error: null }),
    estimatesPayload.length
      ? supabase.from("budget_estimates").insert(estimatesPayload)
      : Promise.resolve({ error: null }),
    benchmarkPayload.length
      ? supabase
          .from("channel_benchmarks")
          .upsert(benchmarkPayload, { onConflict: "workspace_id,platform,metric_key" })
      : Promise.resolve({ error: null })
  ]);

  const error =
    (channelsResult as { error?: { message?: string } | null }).error ||
    (objectivesResult as { error?: { message?: string } | null }).error ||
    (estimatesResult as { error?: { message?: string } | null }).error ||
    (benchmarksResult as { error?: { message?: string } | null }).error;

  if (error) {
    return NextResponse.json({ error: error.message ?? "Falha ao persistir filhos do plano." }, { status: 500 });
  }

  return NextResponse.json({ id: budgetPlanId });
}
