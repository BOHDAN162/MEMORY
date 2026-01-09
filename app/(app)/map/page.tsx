import { MapCanvas } from "@/components/features/map/map-canvas";
import { buttonVariants } from "@/components/ui/button";
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
    <section className="relative -mx-4 -my-6 flex h-[calc(100vh-120px)] w-[calc(100%+2rem)] min-h-[560px] overflow-hidden sm:-mx-8 sm:w-[calc(100%+4rem)]">
      {error ? (
        <div className="absolute left-4 right-4 top-4 z-10 rounded-xl border border-destructive/40 bg-destructive/90 px-4 py-3 text-sm text-destructive-foreground shadow-lg">
          Не удалось загрузить карту интересов: {error}
        </div>
      ) : null}

      <MapCanvas interests={nodes} manualEdges={manualEdges} />
    </section>
  );
};

export default MapPage;
