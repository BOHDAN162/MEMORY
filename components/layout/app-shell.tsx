import ThemeToggle from "@/components/layout/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { navigationItems } from "@/lib/config/navigation";
import { cn } from "@/lib/utils/cn";
import { Sidebar } from "./sidebar";
import Link from "next/link";
import type { ReactNode } from "react";

export const AppShell = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 text-slate-900 transition-colors duration-300 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950 dark:text-white">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex flex-col gap-4 border-b border-slate-200 bg-white/60 px-4 py-4 backdrop-blur-xl transition-colors duration-300 dark:border-white/10 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-indigo-500 dark:text-indigo-200">
              Memory OS
            </p>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              Личная карта интересов
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
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
                    "hover:shadow-indigo-500/30",
                  )}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-white/60 px-4 py-6 transition-colors duration-300 dark:bg-slate-900/30 sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
};
