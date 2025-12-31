"use server";

import { getUserIdByAuthUserId } from "@/lib/server/interests";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type UpdateTelegramResult = {
  error: string | null;
  username?: string | null;
};

const sanitizeTelegramUsername = (value: string): string | null => {
  const trimmed = value.trim();
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;

  if (!withoutAt) {
    return null;
  }

  const isValid = /^[A-Za-z0-9_]{5,32}$/.test(withoutAt);

  if (!isValid) {
    return null;
  }

  return withoutAt;
};

export const updateTelegramUsername = async (
  formData: FormData,
): Promise<UpdateTelegramResult> => {
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

  const rawValue = formData.get("telegram_username");
  const input = typeof rawValue === "string" ? rawValue : "";
  const sanitized = sanitizeTelegramUsername(input);

  if (input.trim() && sanitized === null) {
    return {
      error:
        "Укажите корректный Telegram username: 5-32 символа, только латиница, цифры и подчёркивание, без пробелов и @.",
    };
  }

  const { data: userId, error: userIdError } = await getUserIdByAuthUserId(
    supabase,
    authUser.user,
  );

  if (userIdError || !userId) {
    return { error: userIdError ?? "Unable to ensure user profile." };
  }

  const { error } = await supabase
    .from("users")
    .update({ telegram_username: sanitized })
    .eq("id", userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/profile");

  return { error: null, username: sanitized };
};
