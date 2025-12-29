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
    <section className="rounded-2xl border border-border bg-card/80 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors duration-300">
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-primary">
              Section
            </p>
            <h2 className="text-2xl font-semibold">{title}</h2>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/12 px-4 py-2 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/30">
            Status: {status}
          </span>
        </header>
        <div className="space-y-2 text-base text-muted-foreground">
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
                "border border-border/80",
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
