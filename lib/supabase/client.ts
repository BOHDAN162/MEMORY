"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

const getSupabaseEnv = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return { url, key };
};

export const getSupabaseBrowserClient = (): SupabaseClient | null => {
  if (browserClient) {
    return browserClient;
  }

  const credentials = getSupabaseEnv();

  if (!credentials) {
    return null;
  }

  browserClient = createBrowserClient(credentials.url, credentials.key);

  return browserClient;
};
