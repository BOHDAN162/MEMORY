"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { submitContentFeedback } from "@/lib/server/content/feedback";
import { cn } from "@/lib/utils/cn";

type ContentFeedbackProps = {
  contentId: string;
  provider: string;
  type: string;
  interestIds: string[];
  className?: string;
};

const ContentFeedback = ({
  contentId,
  provider,
  type,
  interestIds,
  className,
}: ContentFeedbackProps) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleFeedback = (value: 1 | -1) => {
    if (acknowledged || isPending) return;

    startTransition(async () => {
      await submitContentFeedback({
        contentId,
        provider,
        type,
        interestIds,
        value,
      });
      setAcknowledged(true);
    });
  };

  const disabled = acknowledged || isPending;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 text-xs text-muted-foreground transition-opacity",
        className,
      )}
    >
      <span className="text-[11px] uppercase tracking-[0.12em] text-foreground/70">
        Оцените:
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-lg px-2 text-xs"
          disabled={disabled}
          onClick={() => handleFeedback(1)}
        >
          <span aria-hidden="true">👍</span>
          Полезно
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-lg px-2 text-xs"
          disabled={disabled}
          onClick={() => handleFeedback(-1)}
        >
          <span aria-hidden="true">👎</span>
          Не полезно
        </Button>
      </div>
      {acknowledged ? <span className="text-[11px] text-primary">Спасибо!</span> : null}
    </div>
  );
};

export default ContentFeedback;
