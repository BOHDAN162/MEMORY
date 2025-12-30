import { AppShell } from "@/components/layout/app-shell";
import { getServerSession } from "@/lib/supabase/server";
import type { ReactNode } from "react";

const AppLayout = async ({ children }: { children: ReactNode }) => {
  const session = await getServerSession();

  return <AppShell isAuthenticated={Boolean(session)}>{children}</AppShell>;
};

export default AppLayout;
