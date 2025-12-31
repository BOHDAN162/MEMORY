"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const ResetPasswordPage = () => {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 6) {
      setError("Пароль должен быть не менее 6 символов.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setError("Supabase не настроен. Проверьте переменные окружения.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Пароль обновлён, можете войти.");
    setTimeout(() => {
      router.replace("/auth?status=password-reset-success");
    }, 800);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground transition-colors duration-300">
      <div className="w-full max-w-xl space-y-6 rounded-2xl border border-border bg-card/90 p-6 shadow-[0_28px_80px_-45px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Сброс пароля</h1>
          <p className="text-muted-foreground">Введите новый пароль и подтвердите его.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="space-y-2 text-sm font-medium">
            <span className="block text-sm text-muted-foreground">Новый пароль</span>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm shadow-inner shadow-black/5 outline-none ring-0 transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Минимум 6 символов"
              disabled={isSubmitting}
            />
          </label>

          <label className="space-y-2 text-sm font-medium">
            <span className="block text-sm text-muted-foreground">Подтверждение пароля</span>
            <input
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm shadow-inner shadow-black/5 outline-none ring-0 transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Повторите пароль"
              disabled={isSubmitting}
            />
          </label>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? <p className="text-sm text-green-600">{success}</p> : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">После обновления пароля войдите снова.</p>
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? "Сохранение..." : "Сохранить новый пароль"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
