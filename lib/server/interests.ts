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

export const getCurrentUserInterests = async (): Promise<ServiceResponse<Interest[]>> => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      data: null,
      error: "Supabase client is not configured. Check environment variables.",
    };
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userData?.user) {
    return { data: [], error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("user_interests")
    .select("interest:interests(id, slug, title, cluster, synonyms)")
    .eq("user_id", userData.user.id);

  if (error) {
    return { data: null, error: error.message };
  }

  const interests: Interest[] =
    data
      ?.map((row) => {
        const interestData = (row as { interest?: Interest | Interest[] | null }).interest;
        const interest = Array.isArray(interestData) ? interestData[0] : interestData;
        if (!interest) return null;

        return {
          id: interest.id,
          slug: interest.slug,
          title: interest.title,
          cluster: interest.cluster ?? null,
          synonyms: Array.isArray(interest.synonyms) ? interest.synonyms : [],
        } as Interest;
      })
      .filter((interest): interest is Interest => Boolean(interest)) ?? [];

  interests.sort((a, b) => {
    const clusterA = a.cluster ?? "";
    const clusterB = b.cluster ?? "";

    if (clusterA.localeCompare(clusterB) !== 0) {
      return clusterA.localeCompare(clusterB);
    }

    return a.title.localeCompare(b.title);
  });

  return { data: interests, error: null };
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

export const setCurrentUserInterests = async (
  interestIds: string[],
): Promise<ServiceResponse<null>> => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      data: null,
      error: "Supabase client is not configured. Check environment variables.",
    };
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userData?.user) {
    return { data: null, error: "Not authenticated" };
  }

  const userId = userData.user.id;

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

  const { error: insertError } = await supabase.from("user_interests").insert(rows);

  if (insertError) {
    return { data: null, error: insertError.message };
  }

  return { data: null, error: null };
};
