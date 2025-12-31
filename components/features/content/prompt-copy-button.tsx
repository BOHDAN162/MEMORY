"use client";

import { useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type PromptCopyButtonProps = {
  text: string;
};

const PromptCopyButton = ({ text }: PromptCopyButtonProps) => {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const timeoutRef = useRef<number | null>(null);

  const resetLater = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => setStatus("idle"), 1800);
  };

  const handleCopy = async () => {
    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error("Clipboard API недоступен");
      }
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch (error) {
      console.error("[prompts] copy failed", (error as Error)?.message ?? error);
      setStatus("error");
    } finally {
      resetLater();
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const toastMessage =
    status === "copied" ? "Скопировано" : status === "error" ? "Не удалось скопировать" : "";

  return (
    <div className="relative inline-flex items-center gap-2">
      <button
        type="button"
        className={buttonVariants({ variant: "primary", size: "sm" })}
        onClick={handleCopy}
      >
        Скопировать
      </button>
      <div aria-live="polite" className="sr-only">
        {toastMessage || "Скопировать текст промпта"}
      </div>
      <div
        className={cn(
          "pointer-events-none absolute -top-12 right-0 rounded-lg px-3 py-2 text-xs font-semibold shadow-sm transition-all duration-200",
          status === "error"
            ? "bg-destructive text-destructive-foreground"
            : "bg-emerald-500 text-emerald-50",
          toastMessage ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
        )}
      >
        {toastMessage || " "}
      </div>
    </div>
  );
};

export default PromptCopyButton;
