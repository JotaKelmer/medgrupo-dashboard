import { NextResponse } from "next/server";
import { getSupabaseAdmin, shouldUseMocks } from "@/lib/supabase/admin";
import {
  requireApiModuleAccess,
  requireApiModuleEditAccess,
} from "@/lib/auth/guards";

type CommercialFeedbackRow = {
  id: string;
  workspace_id: string;
  owner_external_id: string;
  owner_name: string;
  period_start: string;
  period_end: string;
  ai_feedback: string | null;
  manual_feedback: string | null;
  created_at: string;
  updated_at: string;
  author_user_id: string | null;
};

type UserProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const context = await requireApiModuleAccess("excelencia_comercial");

    if (shouldUseMocks()) {
      return NextResponse.json({ feedbacks: [] });
    }

    const ownerId = new URL(request.url).searchParams.get("ownerId")?.trim();
    if (!ownerId) {
      return jsonError("ownerId é obrigatório.");
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return jsonError("Supabase admin não configurado.", 500);
    }

    const { data, error } = await supabase
      .from("commercial_feedbacks")
      .select(
        [
          "id",
          "workspace_id",
          "owner_external_id",
          "owner_name",
          "period_start",
          "period_end",
          "ai_feedback",
          "manual_feedback",
          "created_at",
          "updated_at",
          "author_user_id",
        ].join(", "),
      )
      .eq("workspace_id", context.workspaceMember.workspace_id)
      .eq("owner_external_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return jsonError(error.message, 500);
    }

    const feedbackRows: CommercialFeedbackRow[] = Array.isArray(data)
      ? (data as unknown as CommercialFeedbackRow[])
      : [];

    const authorIds = Array.from(
      new Set(
        feedbackRows
          .map((item) => item.author_user_id)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const authorNameMap = new Map<string, string>();

    if (authorIds.length) {
      const { data: authors, error: authorsError } = await supabase
        .from("user_profiles")
        .select("id, full_name, email")
        .in("id", authorIds);

      if (authorsError) {
        return jsonError(authorsError.message, 500);
      }

      const authorRows: UserProfileRow[] = Array.isArray(authors)
        ? (authors as unknown as UserProfileRow[])
        : [];

      for (const author of authorRows) {
        authorNameMap.set(
          author.id,
          author.full_name || author.email || "Usuário",
        );
      }
    }

    return NextResponse.json({
      feedbacks: feedbackRows.map((item) => ({
        id: item.id,
        workspaceId: item.workspace_id,
        ownerId: item.owner_external_id,
        ownerName: item.owner_name,
        periodStart: item.period_start,
        periodEnd: item.period_end,
        aiFeedback: item.ai_feedback,
        manualFeedback: item.manual_feedback,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        authorUserId: item.author_user_id,
        authorName: item.author_user_id
          ? authorNameMap.get(item.author_user_id) ?? null
          : null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNAUTHORIZED";
    const status =
      message === "FORBIDDEN" ? 403 : message === "UNAUTHORIZED" ? 401 : 500;

    return jsonError(message, status);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireApiModuleEditAccess("excelencia_comercial");

    if (shouldUseMocks()) {
      return jsonError("Feedback desabilitado em modo mock.", 400);
    }

    const body = (await request.json()) as {
      ownerId?: string;
      ownerName?: string;
      periodStart?: string;
      periodEnd?: string;
      aiFeedback?: string | null;
      manualFeedback?: string | null;
    };

    const ownerId = body.ownerId?.trim();
    const ownerName = body.ownerName?.trim();
    const periodStart = body.periodStart?.trim();
    const periodEnd = body.periodEnd?.trim();
    const manualFeedback = body.manualFeedback?.trim() ?? "";
    const aiFeedback = body.aiFeedback?.trim() || null;

    if (!ownerId || !ownerName || !periodStart || !periodEnd) {
      return jsonError(
        "ownerId, ownerName, periodStart e periodEnd são obrigatórios.",
      );
    }

    if (!manualFeedback && !aiFeedback) {
      return jsonError("Informe um feedback manual ou um rascunho sugerido.");
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return jsonError("Supabase admin não configurado.", 500);
    }

    const payload = {
      workspace_id: context.workspaceMember.workspace_id,
      owner_external_id: ownerId,
      owner_name: ownerName,
      period_start: periodStart,
      period_end: periodEnd,
      ai_feedback: aiFeedback,
      manual_feedback: manualFeedback || null,
      author_user_id: context.user.id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("commercial_feedbacks")
      .upsert(payload, {
        onConflict: "workspace_id,owner_external_id,period_start,period_end",
      })
      .select(
        [
          "id",
          "workspace_id",
          "owner_external_id",
          "owner_name",
          "period_start",
          "period_end",
          "ai_feedback",
          "manual_feedback",
          "created_at",
          "updated_at",
          "author_user_id",
        ].join(", "),
      )
      .single();

    if (error || !data) {
      return jsonError(error?.message ?? "Falha ao salvar feedback.", 500);
    }

    const feedbackRow = data as unknown as CommercialFeedbackRow;

    return NextResponse.json({
      feedback: {
        id: feedbackRow.id,
        workspaceId: feedbackRow.workspace_id,
        ownerId: feedbackRow.owner_external_id,
        ownerName: feedbackRow.owner_name,
        periodStart: feedbackRow.period_start,
        periodEnd: feedbackRow.period_end,
        aiFeedback: feedbackRow.ai_feedback,
        manualFeedback: feedbackRow.manual_feedback,
        createdAt: feedbackRow.created_at,
        updatedAt: feedbackRow.updated_at,
        authorUserId: feedbackRow.author_user_id,
        authorName: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNAUTHORIZED";
    const status =
      message === "FORBIDDEN" ? 403 : message === "UNAUTHORIZED" ? 401 : 500;

    return jsonError(message, status);
  }
}