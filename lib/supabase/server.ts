import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient, Session } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseCredentials } from "@/lib/config/env";

export const createSupabaseServerClient = async (): Promise<SupabaseClient | null> => {
  const credentials = getSupabaseCredentials();

  if (!credentials) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(credentials.url, credentials.anonKey, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // noop - cookies() is readonly in server components.
        }
      },
      remove: (name: string, options: CookieOptions) => {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // noop - cookies() is readonly in server components.
        }
      },
    },
  });
};

export const getServerSession = async (): Promise<Session | null> => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data } = await supabase.auth.getSession();

  return data.session ?? null;
};
