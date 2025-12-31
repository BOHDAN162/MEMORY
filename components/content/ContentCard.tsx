"use client";

import { ExternalLink, Sparkles } from "lucide-react";
import ContentFeedback from "@/components/features/content/content-feedback";
import PromptCopyButton from "@/components/features/content/prompt-copy-button";
import { buttonVariants } from "@/components/ui/button";
import type { NormalizedContentItem } from "@/components/content/content-hub";
import { cn } from "@/lib/utils/cn";

type ContentCardProps = {
  item: NormalizedContentItem;
  debug?: boolean;
};

const badgeClassName =
  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]";

const typeAccent: Partial<Record<NormalizedContentItem["type"], string>> = {
  video: "bg-primary/10 text-primary",
  book: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  article: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  channel: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  prompt: "bg-purple-500/10 text-purple-500",
};

export const ContentCard = ({ item, debug = false }: ContentCardProps) => {
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card/80 p-4 shadow-sm shadow-black/5 transition-all duration-200",
        "hover:-translate-y-[2px] hover:shadow-lg hover:shadow-primary/10",
        "focus-within:ring-2 focus-within:ring-primary/60 focus-within:ring-offset-2 focus-within:ring-offset-background",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn(badgeClassName, typeAccent[item.type] ?? "bg-muted text-foreground/80")}>
            {item.typeLabel}
          </span>
          <span className={cn(badgeClassName, "bg-muted text-foreground/70")}>{item.providerLabel}</span>
        </div>
        {item.score !== undefined && item.score !== null ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-inner shadow-black/5">
            <Sparkles className="h-3 w-3" aria-hidden />
            {item.score.toFixed(2)}
          </span>
        ) : null}
      </div>

      <div className="space-y-3">
        <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-foreground">{item.title}</h3>
        {item.description ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">{item.description}</p>
        ) : null}

        {item.whyText ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/50 p-3 text-sm text-muted-foreground">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Почему рекомендовано
            </p>
            <p className="mt-1 leading-relaxed text-foreground/90">{item.whyText}</p>
          </div>
        ) : null}

        {item.type === "prompt" && item.promptText ? (
          <div className="space-y-2 rounded-xl bg-background/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Текст промпта</p>
            <p className="line-clamp-4 text-sm leading-relaxed text-foreground">{item.promptText}</p>
            {item.promptTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {item.promptTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-auto space-y-3">
        <div className="flex flex-wrap gap-2">
          {item.interestTitles?.length
            ? item.interestTitles.map((interest) => (
                <span
                  key={interest}
                  className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground"
                >
                  {interest}
                </span>
              ))
            : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {item.dateLabel ? <span className="rounded-full bg-muted px-2 py-1">{item.dateLabel}</span> : null}
          {item.cachedAt ? (
            <span className="rounded-full bg-muted px-2 py-1">
              Cache: {new Date(item.cachedAt).toLocaleString()}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {item.url ? (
            <a
              className={cn(buttonVariants({ variant: "primary", size: "sm" }), "group/open text-sm")}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Открыть ${item.title}`}
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              Открыть
            </a>
          ) : null}

          {item.type === "prompt" && item.promptText ? <PromptCopyButton text={item.promptText} /> : null}
        </div>

        <ContentFeedback
          className="md:pointer-events-none md:opacity-0 md:transition-opacity md:duration-200 md:group-hover:pointer-events-auto md:group-hover:opacity-100"
          contentId={item.id}
          interestIds={item.interestIds}
          provider={item.provider}
          type={item.type}
        />

        {debug ? (
          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            <span className="rounded-full bg-muted px-2 py-1">provider: {item.provider}</span>
            <span className="rounded-full bg-muted px-2 py-1">type: {item.type}</span>
            <span className="rounded-full bg-muted px-2 py-1">interests: {item.interestIds.length}</span>
          </div>
        ) : null}
      </div>
    </article>
  );
};

export default ContentCard;
