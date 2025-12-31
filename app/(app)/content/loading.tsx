const SkeletonCard = () => (
  <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card/70 p-4 shadow-inner shadow-black/5">
    <div className="flex items-center gap-2">
      <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
      <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
    </div>
    <div className="h-5 w-5/6 rounded bg-muted animate-pulse" />
    <div className="h-4 w-full rounded bg-muted animate-pulse" />
    <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
    <div className="mt-auto flex flex-wrap gap-2">
      <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
      <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
    </div>
    <div className="h-9 w-24 rounded-xl bg-muted animate-pulse" />
  </div>
);

const ContentLoading = () => {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2">
        <p className="h-4 w-24 rounded bg-muted animate-pulse" />
        <div className="h-8 w-40 rounded bg-muted animate-pulse" />
        <div className="h-4 w-64 rounded bg-muted animate-pulse" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Загружаем подборку…</p>
    </section>
  );
};

export default ContentLoading;
