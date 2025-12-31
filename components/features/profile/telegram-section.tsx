"use client";

import { useState, useTransition, type FormEvent } from "react";
import { updateTelegramUsername } from "@/app/actions/update-telegram-username";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type StatusMessage = {
  type: "success" | "error";
  message: string;
};

type TelegramSectionProps = {
  initialUsername: string | null;
};

export const TelegramSection = ({ initialUsername }: TelegramSectionProps) => {
  const [inputValue, setInputValue] = useState(() => initialUsername ?? "");
  const [savedUsername, setSavedUsername] = useState(() => initialUsername ?? "");
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateTelegramUsername(formData);

      if (result.error) {
        setStatus({ type: "error", message: result.error });
        return;
      }

      const normalized = result.username ?? "";
      setSavedUsername(normalized);
      setInputValue(normalized);
      setStatus({ type: "success", message: "Сохранено" });
    });
  };

  const writeLink = savedUsername ? `https://t.me/${savedUsername}` : null;

  return (
    <section className="rounded-2xl border border-border bg-card/80 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors duration-300">
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-primary">Контакты</p>
            <h2 className="text-2xl font-semibold">Telegram</h2>
            <p className="text-sm text-muted-foreground">
              Добавьте username, чтобы участники могли связаться с вами напрямую.
            </p>
          </div>
          {writeLink ? (
            <a
              href={writeLink}
              target="_blank"
              rel="noreferrer noopener"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "border border-border/80 text-primary",
              )}
            >
              Написать в Telegram
            </a>
          ) : null}
        </header>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label htmlFor="telegram_username" className="text-sm font-medium text-foreground">
              Telegram username
            </label>
            <input
              id="telegram_username"
              name="telegram_username"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="username without @"
              className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm shadow-inner shadow-black/5 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {status ? (
                <span
                  className={status.type === "success" ? "text-green-600" : "text-destructive"}
                >
                  {status.message}
                </span>
              ) : (
                <span>Можно оставить пустым или указать username без @.</span>
              )}
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Сохраняем..." : "Сохранить"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
};
