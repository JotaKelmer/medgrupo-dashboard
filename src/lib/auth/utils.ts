import { DEFAULT_AFTER_LOGIN_PATH } from "./constants";

export function getSafeNextPath(nextParam: string | null | undefined) {
  if (!nextParam) return DEFAULT_AFTER_LOGIN_PATH;
  if (!nextParam.startsWith("/")) return DEFAULT_AFTER_LOGIN_PATH;
  if (nextParam.startsWith("//")) return DEFAULT_AFTER_LOGIN_PATH;
  if (nextParam.startsWith("/auth/")) return DEFAULT_AFTER_LOGIN_PATH;
  return nextParam;
}

export function getAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export function buildAbsoluteUrl(pathname: string) {
  const safePath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${getAppUrl()}${safePath}`;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function parseBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  return fallback;
}
