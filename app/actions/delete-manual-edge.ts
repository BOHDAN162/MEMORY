"use server";

import { getUserIdByAuthUserId } from "@/lib/server/interests";
import { deleteManualEdge, normalizeEdgePair } from "@/lib/supabase/interestEdges";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type DeleteManualEdgeResult = {
  error: string | null;
};

export const deleteManualEdgeAction = async (payload: {
  sourceId: string;
  targetId: string;
}): Promise<DeleteManualEdgeResult> => {
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

  const [sourceId, targetId] = normalizeEdgePair(payload.sourceId, payload.targetId);

  if (!sourceId || !targetId) {
    return { error: "Укажите два разных интереса." };
  }

  const { data: userId, error: userIdError } = await getUserIdByAuthUserId(
    supabase,
    authUser.user,
  );

  if (userIdError || !userId) {
    return { error: userIdError ?? "Unable to ensure user profile." };
  }

  const { error } = await deleteManualEdge(supabase, userId, sourceId, targetId);

  if (error) {
    return { error };
  }

  revalidatePath("/map");

  return { error: null };
};
