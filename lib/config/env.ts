export type SupabaseCredentials = {
  url: string;
  anonKey: string;
};

let hasLoggedMissingSupabaseEnv = false;
let hasLoggedMissingServiceRoleKey = false;
let hasLoggedMissingAIKeys = false;

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

export const getSupabaseServiceRoleKey = (): string | null => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    if (process.env.NODE_ENV !== "production" && !hasLoggedMissingServiceRoleKey) {
      hasLoggedMissingServiceRoleKey = true;
      console.warn(
        "Supabase service role key is missing. Set SUPABASE_SERVICE_ROLE_KEY for server-side operations.",
      );
    }
    return null;
  }

  return serviceKey;
};

export const getEmbeddingApiKey = (): string | null => {
  const key =
    process.env.EMBEDDINGS_API_KEY || process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;

  if (!key && process.env.NODE_ENV !== "production" && !hasLoggedMissingAIKeys) {
    hasLoggedMissingAIKeys = true;
    console.warn(
      "Embedding API key is missing. Set EMBEDDINGS_API_KEY or OPENAI_API_KEY to enable semantic retrieval.",
    );
  }

  return key ?? null;
};

export const getLLMApiKey = (): string | null => {
  const key = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.EMBEDDINGS_API_KEY;

  if (!key && process.env.NODE_ENV !== "production" && !hasLoggedMissingAIKeys) {
    hasLoggedMissingAIKeys = true;
    console.warn(
      "LLM API key is missing. Set LLM_API_KEY or OPENAI_API_KEY to enable reranking.",
    );
  }

  return key ?? null;
};
