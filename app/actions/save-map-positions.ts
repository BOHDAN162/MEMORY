"use server";

import { getUserIdByAuthUserId } from "@/lib/server/interests";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SaveManyMapPositionsResult = { error: string | null };

type PositionPayload = {
  interestId: string;
  x: number;
  y: number;
};

export const saveMapPositions = async (payload: {
  positions: PositionPayload[];
}): Promise<SaveManyMapPositionsResult> => {
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

  if (!Array.isArray(payload.positions) || payload.positions.length === 0) {
    return { error: null };
  }

  const normalized = payload.positions
    .map((item) => ({
      interestId: item.interestId,
      x: Number(item.x),
      y: Number(item.y),
    }))
    .filter(
      (item) =>
        Boolean(item.interestId) &&
        Number.isFinite(item.x) &&
        Number.isFinite(item.y),
    );

  if (normalized.length === 0) {
    return { error: "No valid coordinates provided." };
  }

  const { data: userId, error: userIdError } = await getUserIdByAuthUserId(
    supabase,
    authUser.user,
  );

  if (userIdError || !userId) {
    return { error: userIdError ?? "Unable to ensure user profile." };
  }

  const { error } = await supabase.from("map_layout").upsert(
    normalized.map((item) => ({
      user_id: userId,
      interest_id: item.interestId,
      x: item.x,
      y: item.y,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "user_id,interest_id" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/map");

  return { error: null };
};
