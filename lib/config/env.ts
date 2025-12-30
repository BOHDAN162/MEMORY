export type SupabaseCredentials = {
  url: string;
  anonKey: string;
};

let hasLoggedMissingSupabaseEnv = false;

export const getSupabaseCredentials = (): SupabaseCredentials | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (process.env.NODE_ENV !== "production" && !hasLoggedMissingSupabaseEnv) {
      hasLoggedMissingSupabaseEnv = true;
      console.error(
        "Supabase environment variables are missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
    }
    return null;
  }

  return { url, anonKey };
};
