import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";
import { getSupabaseCredentials } from "@/lib/config/env";

export const createSupabaseMiddlewareClient = (
  request: NextRequest,
  response: NextResponse,
): SupabaseClient | null => {
  const credentials = getSupabaseCredentials();

  if (!credentials) {
    return null;
  }

  return createServerClient(credentials.url, credentials.anonKey, {
    cookies: {
      get: (name: string) => request.cookies.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => {
        try {
          request.cookies.set({ name, value, ...options });
        } catch {
          // noop - best-effort sync between request/response cookies
        }
        response.cookies.set({ name, value, ...options });
      },
      remove: (name: string, options: CookieOptions) => {
        try {
          request.cookies.set({ name, value: "", ...options });
        } catch {
          // noop - best-effort sync between request/response cookies
        }
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });
};
