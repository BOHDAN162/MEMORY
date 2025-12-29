import Link from "next/link";

export const Logo = () => {
  return (
    <Link href="/" className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-slate-900 text-white shadow-lg shadow-indigo-500/20">
        <span className="text-base font-semibold">M</span>
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          MEMORY
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Living knowledge
        </p>
      </div>
    </Link>
  );
};
