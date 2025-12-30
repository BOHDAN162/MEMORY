export type SupabaseCredentials = {
  url: string;
  anonKey: string;
};

export const getSupabaseCredentials = (): SupabaseCredentials | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
};
