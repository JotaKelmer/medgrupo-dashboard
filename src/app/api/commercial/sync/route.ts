import { NextResponse } from "next/server";
import { requireApiModuleEditAccess } from "@/lib/auth/guards";
import { getDefaultCommercialPeriod } from "@/lib/commercial/utils";
import { collectCommercialMetricsFromPipedrive } from "@/lib/commercial/pipedrive-sync";
import { getSupabaseAdmin, shouldUseMocks } from "@/lib/supabase/admin";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function POST(request: Request) {
  let runId: string | null = null;

  try {
    const context = await requireApiModuleEditAccess("excelencia_comercial");

    if (shouldUseMocks()) {
      return NextResponse.json({ inserted: 0, mode: "mock" });
    }

    const body = (await request.json().catch(() => ({}))) as {
      startDate?: string;
      endDate?: string;
    };

    const defaults = getDefaultCommercialPeriod();
    const startDate = body.startDate?.trim() || defaults.startDate;
    const endDate = body.endDate?.trim() || defaults.endDate;

    if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
      return jsonError("startDate e endDate devem estar no formato YYYY-MM-DD.");
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return jsonError("Supabase admin não configurado.", 500);
    }

    const { data: createdRun } = await supabase
      .from("commercial_sync_runs")
      .insert({
        workspace_id: context.workspaceMember.workspace_id,
        status: "running",
        source: "pipedrive",
        started_at: new Date().toISOString(),
        metadata: { startDate, endDate },
      })
      .select("id")
      .single();

    runId = createdRun?.id ?? null;

    const rows = await collectCommercialMetricsFromPipedrive({
      startDate,
      endDate,
    });

    if (rows.length) {
      const payload = rows.map((row) => ({
        ...row,
        workspace_id: context.workspaceMember.workspace_id,
        source: "pipedrive",
        synced_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("commercial_daily_metrics")
        .upsert(payload, {
          onConflict: "workspace_id,metric_date,owner_external_id",
        });

      if (error) {
        throw error;
      }
    }

    if (runId) {
      await supabase
        .from("commercial_sync_runs")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
          inserted_rows: rows.length,
        })
        .eq("id", runId);
    }

    return NextResponse.json({ inserted: rows.length });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao sincronizar Comercial.";

    if (runId) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        await supabase
          .from("commercial_sync_runs")
          .update({
            status: "error",
            finished_at: new Date().toISOString(),
            error_message: message,
          })
          .eq("id", runId);
      }
    }

    return jsonError(message, 500);
  }
}
