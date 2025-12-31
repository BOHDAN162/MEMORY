"use server";

import { getUserIdByAuthUserId } from "@/lib/server/interests";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { upsertMapLayoutPositions } from "@/lib/supabase/map-layout";
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

  const { data: userId, error: userIdError } = await getUserIdByAuthUserId(
    supabase,
    authUser.user,
  );

  if (userIdError || !userId) {
    return { error: userIdError ?? "Unable to ensure user profile." };
  }

  const { error } = await upsertMapLayoutPositions(supabase, userId, payload.positions);

  if (error) {
    const message = typeof error === "string" ? error : error.message;
    return { error: message };
  }

  revalidatePath("/map");

  return { error: null };
};
