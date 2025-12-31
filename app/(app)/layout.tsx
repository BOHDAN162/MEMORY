import { AppShell } from "@/components/layout/app-shell";
import { getOrCreateUserProfile } from "@/lib/server/user-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ReactNode } from "react";

const AppLayout = async ({ children }: { children: ReactNode }) => {
  const supabase = await createSupabaseServerClient();
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };

  if (supabase && data.session?.user) {
    await getOrCreateUserProfile(supabase, data.session.user);
  }

  return <AppShell isAuthenticated={Boolean(data.session)}>{children}</AppShell>;
};

export default AppLayout;
