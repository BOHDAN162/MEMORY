"use server";

import { getUserIdByAuthUserId } from "@/lib/server/interests";
import { determinePersonalityType } from "@/lib/server/personality";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PersonalityAnswerFields, PersonalityTypeId } from "@/lib/types/personality";
import { revalidatePath } from "next/cache";

export type SavePersonalityAnswersResult = {
  error: string | null;
  message?: string;
  personalityType?: PersonalityTypeId | null;
};

const questionIds: Array<keyof PersonalityAnswerFields> = ["q1", "q2", "q3", "q4", "q5"];

const parseAnswers = (formData: FormData): PersonalityAnswerFields => {
  return questionIds.reduce<PersonalityAnswerFields>((acc, questionId) => {
    const value = formData.get(questionId);
    const parsedValue = typeof value === "string" ? Number(value) : null;
    const normalized =
      typeof parsedValue === "number" &&
      Number.isInteger(parsedValue) &&
      parsedValue >= 1 &&
      parsedValue <= 4
        ? parsedValue
        : null;

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
  const hasEmptyFields = questionIds.some((questionId) => answers[questionId] === null);

  if (hasEmptyFields) {
    return { error: "Заполните все вопросы перед сохранением." };
  }

  let personalityType: PersonalityTypeId;

  try {
    personalityType = determinePersonalityType(answers);
  } catch (error) {
    return {
      error: error instanceof Error
        ? error.message
        : "Не удалось определить тип личности. Попробуйте ещё раз.",
    };
  }

  const { data: userId, error: userIdError } = await getUserIdByAuthUserId(
    supabase,
    authUser.user,
  );

  if (userIdError || !userId) {
    return { error: userIdError ?? "Unable to ensure user profile." };
  }

  try {
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
      console.error("Failed to save personality answers", upsertError);
      return { error: "Не удалось сохранить ответы. Попробуйте ещё раз." };
    }
  } catch (error) {
    console.error("Unexpected error while saving personality answers", error);
    return { error: "Что-то пошло не так. Попробуйте ещё раз." };
  }

  try {
    const { error: personalityTypeError } = await supabase
      .from("users")
      .update({ personality_type: personalityType })
      .eq("id", userId);

    if (personalityTypeError) {
      return { error: "Не удалось сохранить тип личности. Попробуйте ещё раз." };
    }
  } catch (error) {
    console.error("Failed to update personality type", error);
    return { error: "Не удалось сохранить тип личности. Попробуйте ещё раз." };
  }

  revalidatePath("/onboarding");
  revalidatePath("/profile");
  revalidatePath("/profile/personality");

  return { error: null, message: "Сохранено", personalityType };
};
