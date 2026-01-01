"use server";

import { getUserIdByAuthUserId } from "@/lib/server/interests";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type AddUserInterestResult = {
  data: { interestId: string } | null;
  error: string | null;
};

export const addUserInterestAction = async (interestId: string): Promise<AddUserInterestResult> => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      data: null,
      error: "Supabase client is not configured. Check environment variables.",
    };
  }

  const { data: authUser, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser?.user) {
    return { data: null, error: "Not authenticated" };
  }

  if (!interestId) {
    return { data: null, error: "Interest ID is required." };
  }

  const { data: userId, error: userIdError } = await getUserIdByAuthUserId(
    supabase,
    authUser.user,
  );

  if (userIdError || !userId) {
    return { data: null, error: userIdError ?? "Unable to ensure user profile." };
  }

  const { data: interest, error: fetchInterestError } = await supabase
    .from("interests")
    .select("id")
    .eq("id", interestId)
    .maybeSingle();

  if (fetchInterestError) {
    return { data: null, error: fetchInterestError.message };
  }

  if (!interest?.id) {
    return { data: null, error: "Интерес не найден." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("user_interests")
    .select("interest_id")
    .eq("user_id", userId)
    .eq("interest_id", interestId)
    .maybeSingle();

  if (existingError && existingError.code !== "PGRST116") {
    return { data: null, error: existingError.message };
  }

  if (!existing) {
    const { error: insertError } = await supabase.from("user_interests").insert({
      user_id: userId,
      interest_id: interestId,
    });

    if (insertError) {
      return { data: null, error: insertError.message };
    }
  }

  revalidatePath("/map");
  revalidatePath("/content");

  return { data: { interestId }, error: null };
};
