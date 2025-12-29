import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, Session } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const getSupabaseEnv = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return { url, key };
};

export const createSupabaseServerClient = async (): Promise<SupabaseClient | null> => {
  const credentials = getSupabaseEnv();

  if (!credentials) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(credentials.url, credentials.key, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      // Cookie mutations are not needed for a read-only session check during bootstrap.
      set: () => {},
      remove: () => {},
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
