import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof Error && "status" in error) {
    const status = Number((error as { status?: number }).status || 500);
    return jsonError(error.message, status);
  }

  if (error instanceof Error) {
    return jsonError(error.message, 500);
  }

  return jsonError("Ocorreu um erro inesperado.", 500);
}
