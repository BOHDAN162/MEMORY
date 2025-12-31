import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type UserProfile = {
  id: string;
  auth_user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  telegram_username: string | null;
  personality_type: string | null;
};

type UserProfileResponse = {
  data: UserProfile | null;
  error: string | null;
};

const getDisplayName = (user: User): string => {
  const metadata = user.user_metadata ?? {};

  const metaName = [metadata.full_name, metadata.name, metadata.user_name].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

  if (metaName) {
    return metaName.trim();
  }

  const emailUsername = user.email?.split("@")[0];

  if (emailUsername && emailUsername.trim().length > 0) {
    return emailUsername.trim();
  }

  return "User";
};

const getAvatarUrl = (user: User): string | null => {
  const metadata = user.user_metadata ?? {};

  const avatarUrl = [metadata.avatar_url, metadata.picture].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

  return avatarUrl ?? null;
};

export const getOrCreateUserProfile = async (
  supabaseClient?: SupabaseClient | null,
  authUser?: User | null,
): Promise<UserProfileResponse> => {
  const supabase = supabaseClient ?? (await createSupabaseServerClient());

  if (!supabase) {
    return { data: null, error: "Supabase client is not configured. Check environment variables." };
  }

  const user =
    authUser ??
    (await supabase.auth.getUser().then(({ data }) => data?.user ?? null).catch(() => null));

  if (!user) {
    return { data: null, error: "Not authenticated" };
  }

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("users")
    .select("id, auth_user_id, display_name, avatar_url, telegram_username, personality_type")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existingProfileError) {
    return { data: null, error: existingProfileError.message };
  }

  if (existingProfile) {
    return { data: existingProfile, error: null };
  }

  const profileInput = {
    auth_user_id: user.id,
    display_name: getDisplayName(user),
    avatar_url: getAvatarUrl(user),
  };

  const { error: upsertError } = await supabase
    .from("users")
    .upsert(profileInput, { onConflict: "auth_user_id", ignoreDuplicates: true });

  if (upsertError) {
    return { data: null, error: upsertError.message };
  }

  const { data: createdProfile, error: profileError } = await supabase
    .from("users")
    .select("id, auth_user_id, display_name, avatar_url, telegram_username, personality_type")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError || !createdProfile) {
    return { data: null, error: profileError?.message ?? "Unable to load user profile." };
  }

  return { data: createdProfile, error: null };
};
