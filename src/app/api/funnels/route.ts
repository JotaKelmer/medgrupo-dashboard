import { NextResponse } from "next/server";
import { getSupabaseAdmin, shouldUseMocks } from "@/lib/supabase/admin";

type StepPayload = {
  id?: string;
  stepLabel: string;
  sourceType: "standard" | "custom";
  metricSource: string;
};

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.workspaceId || !body.name) {
    return NextResponse.json({ error: "workspaceId e name são obrigatórios." }, { status: 400 });
  }

  const steps = (body.steps ?? []) as StepPayload[];
  if (!steps.length) {
    return NextResponse.json({ error: "Ao menos uma etapa é obrigatória." }, { status: 400 });
  }

  if (shouldUseMocks()) {
    return NextResponse.json({ id: body.id ?? crypto.randomUUID() });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  if (body.isDefault) {
    await supabase
      .from("funnels")
      .update({ is_default: false })
      .eq("workspace_id", body.workspaceId);
  }

  const funnelPayload = {
    workspace_id: body.workspaceId,
    name: body.name,
    category: body.category || null,
    description: body.description || null,
    is_default: Boolean(body.isDefault),
    is_active: true
  };

  const result = body.id
    ? await supabase.from("funnels").update(funnelPayload).eq("id", body.id).select("id").single()
    : await supabase.from("funnels").insert(funnelPayload).select("id").single();

  if (result.error || !result.data) {
    return NextResponse.json({ error: result.error?.message ?? "Falha ao salvar funil." }, { status: 500 });
  }

  const funnelId = result.data.id;
  await supabase.from("funnel_steps").delete().eq("funnel_id", funnelId);

  const stepsPayload = steps.map((step, index) => ({
    funnel_id: funnelId,
    step_key: `${step.stepLabel}-${index + 1}`.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
    step_label: step.stepLabel,
    step_order: index + 1,
    source_type: step.sourceType,
    metric_source: step.metricSource,
    is_active: true
  }));

  const { error: stepsError } = await supabase.from("funnel_steps").insert(stepsPayload);
  if (stepsError) {
    return NextResponse.json({ error: stepsError.message }, { status: 500 });
  }

  return NextResponse.json({ id: funnelId });
}
