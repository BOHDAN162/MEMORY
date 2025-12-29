"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { navigationItems } from "@/lib/config/navigation";
import { cn } from "@/lib/utils/cn";

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 border-r border-slate-200 bg-white/70 backdrop-blur-xl transition-colors duration-300 dark:border-white/10 dark:bg-slate-900/50 sm:flex">
      <div className="flex h-full w-full flex-col gap-8 px-4 py-6">
        <Logo />
        <nav className="flex flex-1 flex-col gap-2">
          {navigationItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group rounded-xl px-4 py-3 transition-colors",
                  isActive
                    ? "bg-indigo-50 text-slate-900 shadow-inner shadow-indigo-500/10 dark:bg-white/10 dark:text-white"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white",
                )}
              >
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-slate-500 transition-colors group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200">
                  {item.hint}
                </p>
              </Link>
            );
          })}
        </nav>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 shadow-inner shadow-indigo-500/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          <p className="font-semibold text-slate-900 dark:text-white">MVP map</p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            Навигация уже работает. Функции появятся по шагам следующими
            промптами.
          </p>
        </div>
      </div>
    </aside>
  );
};
