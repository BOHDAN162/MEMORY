import { AuthForm } from "@/components/auth/auth-form";
import { Logo } from "@/components/layout/logo";
import { getSupabaseCredentials } from "@/lib/config/env";
import { getServerSession } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type AuthPageProps = {
  searchParams?: {
    returnUrl?: string;
    status?: string;
  };
};

const sanitizeRedirectTo = (value?: string) => {
  if (!value) {
    return "/content";
  }

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }

  if (!decoded.startsWith("/")) {
    return "/content";
  }

  const normalized = decoded.startsWith("//") ? decoded.replace(/^\/+/, "/") : decoded;

  if (normalized === "/auth") {
    return "/content";
  }

  return normalized || "/content";
};

const AuthPage = async ({ searchParams }: AuthPageProps) => {
  const returnUrl = sanitizeRedirectTo(searchParams?.returnUrl);
  const session = await getServerSession();

  if (session) {
    redirect(returnUrl);
  }

  const credentials = getSupabaseCredentials();
  const hasCredentials = Boolean(credentials);

  const statusMessage = searchParams?.status === "password-reset-success"
    ? "Пароль обновлён, войдите"
    : null;

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

        {statusMessage ? <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{statusMessage}</p> : null}

        <AuthForm hasCredentials={hasCredentials} returnUrl={returnUrl} />

        <p className="text-xs text-muted-foreground">
          После входа вы автоматически вернётесь на /content и увидите персональные интересы.
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
