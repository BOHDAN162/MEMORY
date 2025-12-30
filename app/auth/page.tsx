import { AuthForm } from "@/components/auth/auth-form";
import { Logo } from "@/components/layout/logo";
import { getSupabaseCredentials } from "@/lib/config/env";
import { getServerSession } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const AuthPage = async () => {
  const session = await getServerSession();

  if (session) {
    redirect("/content");
  }

  const credentials = getSupabaseCredentials();
  const hasCredentials = Boolean(credentials);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground transition-colors duration-300">
      <div className="w-full max-w-xl space-y-6 rounded-2xl border border-border bg-card/90 p-6 shadow-[0_28px_80px_-45px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <Logo />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Вход / регистрация</h1>
          <p className="text-muted-foreground">
            Используйте email и пароль Supabase Auth. После успешного входа вы попадёте на страницу
            контента.
          </p>
        </div>

        {!hasCredentials ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/60 p-4 text-sm text-destructive">
            Переменные окружения NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY не заданы.
            Добавьте их в .env.local, чтобы авторизация заработала.
          </div>
        ) : null}

        <AuthForm hasCredentials={hasCredentials} />

        <p className="text-xs text-muted-foreground">
          После входа вы автоматически вернётесь на /content и увидите персональные интересы.
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
