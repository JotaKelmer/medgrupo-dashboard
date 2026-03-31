"use client";

import { createBrowserClient } from "@supabase/ssr";

const clientCache = new Map<string, ReturnType<typeof createBrowserClient>>();

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase não configurado.");
  }

  const cacheKey = `${url}:${key}`;
  const cached = clientCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const client = createBrowserClient(url, key);
  clientCache.set(cacheKey, client);

  return client;
}
