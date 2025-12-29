import Link from "next/link";

export const Logo = () => {
  return (
    <Link href="/" className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-indigo-600 to-slate-900 text-primary-foreground shadow-lg shadow-primary/30">
        <span className="text-base font-semibold">M</span>
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-foreground">MEMORY</p>
        <p className="text-xs text-muted-foreground">Living knowledge</p>
      </div>
    </Link>
  );
};
