import { NextResponse } from "next/server";
import { getSupabaseAdmin, shouldUseMocks } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.workspaceId) {
    return NextResponse.json({ error: "workspaceId é obrigatório." }, { status: 400 });
  }

  if (shouldUseMocks()) {
    return NextResponse.json({ id: body.id ?? "mock-creative-rules" });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const payload = {
    workspace_id: body.workspaceId,
    good_max: Number(body.goodMax ?? 6),
    attention_max: Number(body.attentionMax ?? 10),
    replace_max: Number(body.replaceMax ?? 15),
    critical_max: Number(body.criticalMax ?? 18)
  };

  const { data, error } = await supabase
    .from("creative_frequency_rules")
    .upsert(payload, { onConflict: "workspace_id" })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
