"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

type AuthMode = "sign-in" | "sign-up";

type AuthFormProps = {
  redirectTo?: string;
  hasCredentials: boolean;
};

export const AuthForm = ({ redirectTo = "/content", hasCredentials }: AuthFormProps) => {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const handleAuth = async () => {
    if (!supabase) {
      setError(
        "Supabase client is not configured. Проверьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    if (!email || !password) {
      setError("Введите email и пароль.");
      return;
    }

    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        router.push(redirectTo);
        router.refresh();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        router.push(redirectTo);
        router.refresh();
        return;
      }

      setMessage("Проверьте почту, чтобы подтвердить регистрацию. После подтверждения войдите снова.");
    } catch (authError) {
      console.error("Auth error", authError);
      setError("Не удалось выполнить запрос. Попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
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
          disabled={isSubmitting}
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
          disabled={isSubmitting}
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
            disabled={isSubmitting || !hasCredentials}
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
            disabled={isSubmitting || !hasCredentials}
          />
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-green-600">{message}</p> : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Используется Supabase Auth. {mode === "sign-up" ? "После подтверждения войдите в систему." : "Введите email и пароль для входа."}
          </p>
          <Button type="submit" disabled={!hasCredentials || isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? "Загрузка..." : mode === "sign-in" ? "Войти" : "Создать аккаунт"}
          </Button>
        </div>
      </form>
    </div>
  );
};
