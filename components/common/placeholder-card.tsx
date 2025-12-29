import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type PlaceholderCardProps = {
  title: string;
  description: string[];
  status: string;
  primaryCta?: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
};

export const PlaceholderCard = ({
  title,
  description,
  status,
  primaryCta,
  secondaryCta,
}: PlaceholderCardProps) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-lg shadow-indigo-500/10 transition-colors duration-300 dark:border-white/10 dark:bg-gradient-to-br dark:from-white/5 dark:via-white/0 dark:to-white/5 dark:shadow-indigo-500/15">
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-indigo-500 dark:text-indigo-200">
              Section
            </p>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              {title}
            </h2>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-100 dark:ring-indigo-500/30">
            Status: {status}
          </span>
        </header>
        <div className="space-y-2 text-base text-slate-700 dark:text-slate-200">
          {description.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {primaryCta ? (
            <Link
              href={primaryCta.href}
              className={buttonVariants({ variant: "primary" })}
            >
              {primaryCta.label}
            </Link>
          ) : null}
          {secondaryCta ? (
            <Link
              href={secondaryCta.href}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "border border-white/10",
              )}
            >
              {secondaryCta.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
};
