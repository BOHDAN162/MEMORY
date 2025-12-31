"use server";

import { getUserIdByAuthUserId, replaceUserInterests } from "@/lib/server/interests";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { determinePersonalityType } from "@/lib/server/personality";
import type { PersonalityTypeId } from "@/lib/types/personality";
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
    authUser.user,
  );

  if (userIdError || !userId) {
    return { error: userIdError ?? "Unable to ensure user profile." };
  }

  const { error } = await replaceUserInterests(supabase, userId, interestIds);

  if (error) {
    return { error };
  }

  const { data: answers, error: answersError } = await supabase
    .from("personality_answers")
    .select("q1, q2, q3, q4, q5")
    .eq("user_id", userId)
    .maybeSingle();

  if (answersError) {
    return { error: "Не удалось загрузить ответы теста. Попробуйте ещё раз." };
  }

  if (!answers) {
    return { error: "Ответы теста не найдены. Пройдите тест ещё раз." };
  }

  let personalityType: PersonalityTypeId;

  try {
    personalityType = determinePersonalityType({
      q1: answers.q1 ?? null,
      q2: answers.q2 ?? null,
      q3: answers.q3 ?? null,
      q4: answers.q4 ?? null,
      q5: answers.q5 ?? null,
    });
  } catch (calculationError) {
    return {
      error:
        calculationError instanceof Error
          ? calculationError.message
          : "Не удалось определить тип личности. Попробуйте ещё раз.",
    };
  }

  const { error: personalityTypeUpdateError } = await supabase
    .from("users")
    .update({ personality_type: personalityType })
    .eq("id", userId);

  if (personalityTypeUpdateError) {
    return { error: "Не удалось сохранить тип личности. Попробуйте ещё раз." };
  }

  revalidatePath("/onboarding");
  revalidatePath("/map");
  revalidatePath("/content");

  return { error: null, message: "Сохранено" };
};
