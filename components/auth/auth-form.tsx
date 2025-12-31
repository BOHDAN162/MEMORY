"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail, signInWithPassword, signUpWithPassword } from "@/app/auth/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type AuthMode = "sign-in" | "sign-up";

type AuthFormProps = {
  returnUrl?: string;
  hasCredentials: boolean;
};

export const AuthForm = ({ returnUrl = "/content", hasCredentials }: AuthFormProps) => {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isResetPending, startResetTransition] = useTransition();
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));

  const router = useRouter();

  const handleAuth = async () => {
    if (!email || !password) {
      setError("Введите email и пароль.");
      return;
    }

    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    formData.append("returnUrl", returnUrl);

    const action = mode === "sign-in" ? signInWithPassword : signUpWithPassword;

    startTransition(() => {
      action(formData)
        .then((result) => {
          if (!result) {
            return;
          }

          setError(result.error ?? null);
          setMessage(result.message ?? null);
          if (!result.error) {
            router.refresh();
          }
        })
        .catch((authError) => {
          if (authError instanceof Error && authError.message.includes("NEXT_REDIRECT")) {
            return;
          }
          setError("Не удалось выполнить запрос. Попробуйте ещё раз.");
        });
    });
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      setResetError("Введите email.");
      return;
    }

    setResetError(null);
    setResetMessage(null);

    const formData = new FormData();
    formData.append("email", resetEmail);
    if (origin) {
      formData.append("redirectTo", `${origin}/auth/callback?next=/auth/reset`);
    }

    startResetTransition(() => {
      sendPasswordResetEmail(formData)
        .then((result) => {
          if (!result) return;
          setResetError(result.error ?? null);
          setResetMessage(result.message ?? null);
        })
        .catch(() => {
          setResetError("Не удалось отправить письмо. Попробуйте ещё раз.");
        });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 rounded-xl bg-muted/60 p-1">
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "soft", size: "sm" }),
            "flex-1",
            mode === "sign-in" ? "ring-1 ring-primary/60 shadow-inner shadow-primary/10" : "",
          )}
          onClick={() => setMode("sign-in")}
          disabled={isPending}
        >
          Войти
        </button>
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "soft", size: "sm" }),
            "flex-1",
            mode === "sign-up" ? "ring-1 ring-primary/60 shadow-inner shadow-primary/10" : "",
          )}
          onClick={() => setMode("sign-up")}
          disabled={isPending}
        >
          Зарегистрироваться
        </button>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleAuth();
        }}
      >
        <label className="space-y-2 text-sm font-medium">
          <span className="block text-sm text-muted-foreground">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm shadow-inner shadow-black/5 outline-none ring-0 transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="you@example.com"
            disabled={isPending || !hasCredentials}
          />
        </label>

        <label className="space-y-2 text-sm font-medium">
          <span className="block text-sm text-muted-foreground">Пароль</span>
          <input
            type="password"
            name="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm shadow-inner shadow-black/5 outline-none ring-0 transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Минимум 6 символов"
            disabled={isPending || !hasCredentials}
          />
          <button
            type="button"
            className="text-xs text-primary underline-offset-4 hover:underline"
            onClick={() => setShowReset((prev) => !prev)}
            disabled={isPending || isResetPending || !hasCredentials}
          >
            Забыли пароль?
          </button>
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-green-600">{message}</p> : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Используется Supabase Auth. {mode === "sign-up" ? "После подтверждения войдите в систему." : "Введите email и пароль для входа."}
          </p>
          <Button type="submit" disabled={!hasCredentials || isPending} aria-busy={isPending}>
            {isPending ? "Загрузка..." : mode === "sign-in" ? "Войти" : "Создать аккаунт"}
          </Button>
        </div>
      </form>

      {showReset ? (
        <div className="space-y-3 rounded-xl border border-dashed border-border bg-muted/60 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Восстановление пароля</p>
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setShowReset(false)}
              disabled={isResetPending}
            >
              Скрыть
            </button>
          </div>

          <div className="space-y-2">
            <label className="space-y-1 text-sm font-medium">
              <span className="block text-xs text-muted-foreground">Email</span>
              <input
                type="email"
                name="reset-email"
                autoComplete="email"
                required
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm shadow-inner shadow-black/5 outline-none ring-0 transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="you@example.com"
                disabled={isResetPending || !hasCredentials}
              />
            </label>
            {resetError ? <p className="text-sm text-destructive">{resetError}</p> : null}
            {resetMessage ? <p className="text-sm text-green-600">{resetMessage}</p> : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">Получите письмо для восстановления пароля.</p>
              <Button type="button" onClick={handleResetPassword} disabled={!hasCredentials || isResetPending} aria-busy={isResetPending}>
                {isResetPending ? "Отправка..." : "Отправить письмо"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
