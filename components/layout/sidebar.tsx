"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { navigationItems } from "@/lib/config/navigation";
import { cn } from "@/lib/utils/cn";

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 border-r border-border bg-card/80 backdrop-blur-xl transition-colors duration-300 sm:flex">
      <div className="flex h-full w-full flex-col gap-8 px-5 py-6">
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
                  "group rounded-xl px-4 py-3 transition-all",
                  isActive
                    ? "bg-primary/10 text-foreground ring-1 ring-inset ring-primary/40 shadow-[0_0_0_1px_color-mix(in_srgb,hsl(var(--primary))_20%,transparent)]"
                    : "text-muted-foreground hover:-translate-y-[1px] hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                  {item.hint}
                </p>
              </Link>
            );
          })}
        </nav>
        <div className="rounded-xl border border-border bg-muted/60 px-4 py-3 text-xs text-muted-foreground shadow-inner shadow-primary/10">
          <p className="font-semibold text-foreground">MVP map</p>
          <p className="mt-1 text-muted-foreground">
            Навигация уже работает. Функции появятся по шагам следующими
            промптами.
          </p>
        </div>
      </div>
    </aside>
  );
};
