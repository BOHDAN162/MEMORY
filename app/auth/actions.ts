"use server";

import { getOrCreateUserProfile } from "@/lib/server/user-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type AuthResult = { error?: string | null; message?: string | null };

const sanitizeReturnUrl = (value: string | null | undefined) => {
  if (!value || typeof value !== "string") {
    return "/content";
  }

  if (!value.startsWith("/")) {
    return "/content";
  }

  const normalized = value.startsWith("//") ? value.replace(/^\/+/, "/") : value;

  if (normalized === "/auth") {
    return "/content";
  }

  return normalized.length > 0 ? normalized : "/content";
};

export const signInWithPassword = async (formData: FormData): Promise<AuthResult | void> => {
  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const returnUrl = sanitizeReturnUrl(formData.get("returnUrl")?.toString());

  if (!email || !password) {
    return { error: "Введите email и пароль." };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      error: "Supabase client is not configured. Проверьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    await getOrCreateUserProfile(supabase, data.user);
  }

  redirect(returnUrl);
};

export const signUpWithPassword = async (formData: FormData): Promise<AuthResult> => {
  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const returnUrl = sanitizeReturnUrl(formData.get("returnUrl")?.toString());

  if (!email || !password) {
    return { error: "Введите email и пароль." };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      error: "Supabase client is not configured. Проверьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  const authUser = data.user ?? data.session?.user ?? null;

  if (data.session && authUser) {
    await getOrCreateUserProfile(supabase, authUser);
    redirect(returnUrl);
  }

  return {
    error: null,
    message: "Проверьте почту, чтобы подтвердить регистрацию. После подтверждения войдите снова.",
  };
};

export const logout = async (): Promise<AuthResult> => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      error: "Supabase client is not configured. Проверьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  return { error: null };
};
