import { NextResponse } from "next/server";
import { getSupabaseAdmin, shouldUseMocks } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.workspaceId || !body.metricKey || !body.metricLabel) {
    return NextResponse.json({ error: "workspaceId, metricKey e metricLabel são obrigatórios." }, { status: 400 });
  }

  if (shouldUseMocks()) {
    return NextResponse.json({ id: crypto.randomUUID() });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("custom_metric_definitions")
    .upsert(
      {
        workspace_id: body.workspaceId,
        metric_key: body.metricKey,
        metric_label: body.metricLabel,
        description: body.description || null,
        data_type: "number",
        is_active: true
      },
      { onConflict: "workspace_id,metric_key" }
    )
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
