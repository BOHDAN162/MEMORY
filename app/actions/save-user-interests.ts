"use server";

import { getUserIdByAuthUserId, replaceUserInterests } from "@/lib/server/interests";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SaveUserInterestsResult = { error: string | null; message?: string };

export const saveUserInterests = async (formData: FormData): Promise<SaveUserInterestsResult> => {
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

  const interestIds = formData.getAll("interestIds").map(String);

  const { data: userId, error: userIdError } = await getUserIdByAuthUserId(
    supabase,
    authUser.user.id,
  );

  if (userIdError || !userId) {
    return { error: userIdError ?? "Unable to ensure user profile." };
  }

  const { error } = await replaceUserInterests(supabase, userId, interestIds);

  if (error) {
    return { error };
  }

  revalidatePath("/onboarding");
  revalidatePath("/map");
  revalidatePath("/content");

  return { error: null, message: "Сохранено" };
};
