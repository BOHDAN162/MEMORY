import { NextResponse } from "next/server";
import { getOrCreateUserProfile } from "@/lib/server/user-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const sanitizeNext = (value: string | null) => {
  if (!value || typeof value !== "string") {
    return "/content";
  }

  if (!value.startsWith("/")) {
    return "/content";
  }

  return value.startsWith("//") ? value.replace(/^\/+/, "/") : value;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = sanitizeNext(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect("/auth?status=auth-error");
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.redirect("/auth?status=supabase-missing");
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect("/auth?status=auth-error");
  }

  const authUser = data.session?.user ?? null;

  if (authUser) {
    await getOrCreateUserProfile(supabase, authUser);
  }

  return NextResponse.redirect(next || "/content");
}
