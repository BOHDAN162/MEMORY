import { MapCanvas } from "@/components/features/map/map-canvas";
import { Button, buttonVariants } from "@/components/ui/button";
import { getCurrentUserMapData } from "@/lib/server/map-layout";
import Link from "next/link";

export const dynamic = "force-dynamic";

const MapPage = async () => {
  const { data, error } = await getCurrentUserMapData();

  const nodes = data?.nodes ?? [];
  const manualEdges = data?.manualEdges ?? [];

  if (error === "Not authenticated") {
    return (
      <section className="space-y-4">
        <h1>Карта интересов</h1>
        <div className="rounded-2xl border border-dashed border-border bg-muted/50 p-6 text-muted-foreground shadow-inner shadow-black/5">
          <p className="text-sm text-foreground">Вы не вошли. Перейдите на /auth.</p>
          <Link className={buttonVariants({ variant: "primary", size: "sm" })} href="/auth">
            Войти
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/80 p-5 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)] backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Карта</p>
          <h2 className="text-xl font-semibold">Интерактивная карта интересов</h2>
          <p className="text-sm text-muted-foreground">
            Узлы подтягиваются из выбранных интересов. Перетаскивайте элементы — позиции сохранятся.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="soft" size="sm" disabled>
            Подобрать контент по выбранным
          </Button>
          <Link className={buttonVariants({ variant: "primary", size: "sm" })} href="/content">
            Открыть контент
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
          Не удалось загрузить карту интересов: {error}
        </div>
      ) : null}

      <MapCanvas interests={nodes} manualEdges={manualEdges} />
    </section>
  );
};

export default MapPage;
