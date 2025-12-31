"use server";

import { getUserIdByAuthUserId } from "@/lib/server/interests";
import { createManualEdge, normalizeEdgePair } from "@/lib/supabase/interestEdges";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CreateManualEdgeResult = {
  data: { sourceId: string; targetId: string } | null;
  error: string | null;
};

export const createManualEdgeAction = async (payload: {
  sourceId: string;
  targetId: string;
}): Promise<CreateManualEdgeResult> => {
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

  const [sourceId, targetId] = normalizeEdgePair(payload.sourceId, payload.targetId);

  if (!sourceId || !targetId) {
    return { data: null, error: "Укажите два разных интереса." };
  }

  const { data: userId, error: userIdError } = await getUserIdByAuthUserId(
    supabase,
    authUser.user,
  );

  if (userIdError || !userId) {
    return { data: null, error: userIdError ?? "Unable to ensure user profile." };
  }

  const { data, error } = await createManualEdge(supabase, userId, sourceId, targetId);

  if (error) {
    return { data: null, error };
  }

  revalidatePath("/map");

  return {
    data: data ? { sourceId: data.source_interest_id, targetId: data.target_interest_id } : null,
    error: null,
  };
};
