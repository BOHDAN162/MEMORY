"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseCredentials } from "@/lib/config/env";

let browserClient: SupabaseClient | null = null;

export const getSupabaseBrowserClient = (): SupabaseClient | null => {
  if (browserClient) {
    return browserClient;
  }

  const credentials = getSupabaseCredentials();

  if (!credentials) {
    return null;
  }

  browserClient = createBrowserClient(credentials.url, credentials.anonKey);

  return browserClient;
};
