"use server";

import { getUserIdByAuthUserId } from "@/lib/server/interests";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PersonalityAnswerFields } from "@/lib/types/personality";
import { revalidatePath } from "next/cache";

export type SavePersonalityAnswersResult = { error: string | null; message?: string };

const questionIds: Array<keyof PersonalityAnswerFields> = ["q1", "q2", "q3", "q4", "q5"];

const parseAnswers = (formData: FormData): PersonalityAnswerFields => {
  return questionIds.reduce<PersonalityAnswerFields>((acc, questionId) => {
    const value = formData.get(questionId);
    const normalized = typeof value === "string" ? value.trim() : "";

    return { ...acc, [questionId]: normalized };
  }, {} as PersonalityAnswerFields);
};

export const savePersonalityAnswers = async (
  formData: FormData,
): Promise<SavePersonalityAnswersResult> => {
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

  const answers = parseAnswers(formData);
  const hasEmptyFields = questionIds.some((questionId) => !answers[questionId]);

  if (hasEmptyFields) {
    return { error: "Заполните все вопросы перед сохранением." };
  }

  const { data: userId, error: userIdError } = await getUserIdByAuthUserId(
    supabase,
    authUser.user,
  );

  if (userIdError || !userId) {
    return { error: userIdError ?? "Unable to ensure user profile." };
  }

  const { error: upsertError } = await supabase
    .from("personality_answers")
    .upsert(
      [
        {
          user_id: userId,
          q1: answers.q1,
          q2: answers.q2,
          q3: answers.q3,
          q4: answers.q4,
          q5: answers.q5,
        },
      ],
      { onConflict: "user_id" },
    );

  if (upsertError) {
    return { error: upsertError.message };
  }

  const { error: personalityTypeError } = await supabase
    .from("users")
    .update({ personality_type: "pending" })
    .eq("id", userId)
    .is("personality_type", null);

  if (personalityTypeError) {
    return { error: personalityTypeError.message };
  }

  revalidatePath("/onboarding");

  return { error: null, message: "Сохранено" };
};
