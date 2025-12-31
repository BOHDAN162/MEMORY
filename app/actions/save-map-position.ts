"use server";

import { getUserIdByAuthUserId } from "@/lib/server/interests";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SaveMapPositionResult = { error: string | null };

export const saveMapPosition = async (payload: {
  interestId: string;
  x: number;
  y: number;
}): Promise<SaveMapPositionResult> => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      error: "Supabase client is not configured. Check environment variables.",
    };
  }

  const { data: authUser, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser?.user) {
    return { error: "Not authenticated" };
  }

  if (!payload.interestId) {
    return { error: "Interest ID is required." };
  }

  const x = Number(payload.x);
  const y = Number(payload.y);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { error: "Invalid coordinates." };
  }

  const { data: userId, error: userIdError } = await getUserIdByAuthUserId(
    supabase,
    authUser.user,
  );

  if (userIdError || !userId) {
    return { error: userIdError ?? "Unable to ensure user profile." };
  }

  const { error } = await supabase.from("map_layout").upsert({
    user_id: userId,
    interest_id: payload.interestId,
    x,
    y,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/map");

  return { error: null };
};
