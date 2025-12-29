import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const AuthPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground transition-colors duration-300">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card/90 p-6 shadow-[0_28px_80px_-45px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <Logo />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Вход / регистрация</h1>
          <p className="text-muted-foreground">
            Здесь появится Supabase Auth UI. Пока что это заглушка, чтобы
            протестировать навигацию и тему.
          </p>
        </div>
        <div className="space-y-2 rounded-xl border border-dashed border-border bg-muted/60 p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">
            Текущее поведение
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Авторизация пока не подключена.</li>
            <li>Кнопки ниже ведут в онбординг или сразу на карту.</li>
            <li>По умолчанию root (/) перенаправляет сюда.</li>
          </ul>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/onboarding"
            className={buttonVariants({ variant: "primary" })}
          >
            Go to Onboarding
          </Link>
          <Link
            href="/map"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "border border-border/80",
            )}
          >
            Explore Map
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
