import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const AuthPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-100 px-4 py-10 text-slate-900 transition-colors duration-300 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950 dark:text-white">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-2xl shadow-indigo-500/15 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60">
        <Logo />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Вход / регистрация</h1>
          <p className="text-slate-600 dark:text-slate-300">
            Здесь появится Supabase Auth UI. Пока что это заглушка, чтобы
            протестировать навигацию и тему.
          </p>
        </div>
        <div className="space-y-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          <p className="font-semibold text-slate-900 dark:text-white">
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
              "border border-slate-200 dark:border-white/10",
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
