import { AppShell } from "@/components/layout/app-shell";
import type { ReactNode } from "react";

const AppLayout = ({ children }: { children: ReactNode }) => {
  return <AppShell>{children}</AppShell>;
};

export default AppLayout;
