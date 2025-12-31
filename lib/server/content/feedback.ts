"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type FeedbackInput = {
  contentId: string;
  provider: string;
  type: string;
  interestIds: string[];
  value: 1 | -1;
};

export const submitContentFeedback = async (input: FeedbackInput): Promise<{ ok: boolean }> => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[content] feedback skipped: supabase client is not configured");
    }
    return { ok: false };
  }

  try {
    const interestIds = Array.from(new Set((input.interestIds ?? []).filter(Boolean)));
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;

    const payload = {
      user_id: userId,
      content_id: input.contentId,
      provider: input.provider,
      type: input.type,
      interest_ids: interestIds,
      value: input.value,
    };

    const { error } = await supabase.from("content_feedback").insert(payload);

    if (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[content] feedback insert failed", error.message);
      }
      return { ok: false };
    }

    return { ok: true };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[content] feedback submit failed", error);
    }
    return { ok: false };
  }
};
