import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Interest, ServiceResponse } from "@/lib/types/interests";

export const getInterests = async (): Promise<ServiceResponse<Interest[]>> => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      data: null,
      error: "Supabase client is not configured. Check environment variables.",
    };
  }

  const { data, error } = await supabase
    .from("interests")
    .select("id, slug, title, cluster, synonyms")
    .order("cluster", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data:
      data?.map((interest) => ({
        ...interest,
        synonyms: interest.synonyms ?? [],
      })) ?? [],
    error: null,
  };
};

export const getUserInterests = async (
  userId: string,
): Promise<ServiceResponse<string[]>> => {
  if (!userId) {
    return { data: null, error: "User ID is required to fetch interests." };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      data: null,
      error: "Supabase client is not configured. Check environment variables.",
    };
  }

  const { data, error } = await supabase
    .from("user_interests")
    .select("interest_id")
    .eq("user_id", userId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data ?? []).map((row) => row.interest_id), error: null };
};

export const setUserInterests = async (
  userId: string,
  interestIds: string[],
): Promise<ServiceResponse<null>> => {
  if (!userId) {
    return { data: null, error: "User ID is required to save interests." };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      data: null,
      error: "Supabase client is not configured. Check environment variables.",
    };
  }

  const { error: deleteError } = await supabase
    .from("user_interests")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    return { data: null, error: deleteError.message };
  }

  if (interestIds.length === 0) {
    return { data: null, error: null };
  }

  const rows = interestIds.map((interestId) => ({
    user_id: userId,
    interest_id: interestId,
  }));

  const { error: insertError } = await supabase
    .from("user_interests")
    .insert(rows);

  if (insertError) {
    return { data: null, error: insertError.message };
  }

  return { data: null, error: null };
};
