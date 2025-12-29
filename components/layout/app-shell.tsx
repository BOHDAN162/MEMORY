import ThemeToggle from "@/components/layout/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { navigationItems } from "@/lib/config/navigation";
import { cn } from "@/lib/utils/cn";
import { Sidebar } from "./sidebar";
import Link from "next/link";
import type { ReactNode } from "react";

export const AppShell = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex flex-col gap-4 border-b border-border bg-card/80 px-4 py-4 backdrop-blur-lg shadow-[0_12px_40px_-24px_rgba(0,0,0,0.45)] transition-colors duration-300 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-primary">
              Memory OS
            </p>
            <h1 className="text-xl font-bold">
              Личная карта интересов
            </h1>
            <p className="text-sm text-muted-foreground">
              Навигация уже готова, функции будем подключать шагами.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <ThemeToggle />
            <div className="flex flex-wrap gap-2 sm:hidden">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    buttonVariants({ variant: "soft", size: "sm" }),
                    "shadow-sm hover:shadow-md hover:shadow-primary/20",
                  )}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-background px-4 py-6 transition-colors duration-300 sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
