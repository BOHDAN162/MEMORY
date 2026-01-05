"use client";

import { useMemo, useState, type ReactNode } from "react";
import { X, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContentDebugInfo, NormalizedContentItem } from "@/components/content/content-hub";
import { cn } from "@/lib/utils/cn";

type ContentDebugPanelProps = {
  debug: ContentDebugInfo | null;
  items: NormalizedContentItem[];
  className?: string;
};

const DebugSection = ({
  title,
  children,
  description,
}: {
  title: string;
  children: ReactNode;
  description?: string;
}) => (
  <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{title}</p>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
    {children}
  </div>
);

const StatRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium text-foreground">{value ?? "—"}</span>
  </div>
);

const KeyValuePills = ({
  data,
  emptyLabel,
}: {
  data: Record<string, React.ReactNode> | undefined;
  emptyLabel: string;
}) => {
  const entries = Object.entries(data ?? {}).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground shadow-inner shadow-black/5"
        >
          <span className="text-muted-foreground">{key}</span>
          <span className="font-semibold text-foreground">{String(value)}</span>
        </span>
      ))}
    </div>
  );
};

const ContentDebugPanel = ({ debug, items, className }: ContentDebugPanelProps) => {
  const [open, setOpen] = useState(false);

  const sampleItems = useMemo(() => items.slice(0, 5), [items]);
  const providerStats = useMemo(() => debug?.providers ?? {}, [debug]);

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="h-9 rounded-lg bg-background/80 px-3 text-xs shadow-sm shadow-black/5"
        onClick={() => setOpen(true)}
      >
        <Bug className="mr-2 h-4 w-4" aria-hidden />
        Debug
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/50 px-3 py-6 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-background shadow-2xl ring-1 ring-border">
            <div className="flex items-center justify-between border-b border-border/80 bg-muted/60 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Semantic pipeline
                </p>
                <h2 className="text-lg font-semibold text-foreground">Content Debug Panel</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg"
                aria-label="Close debug panel"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden />
              </Button>
            </div>

            <div className="max-h-[80vh] space-y-4 overflow-auto px-4 py-4">
              {debug?.fallback?.reason ? (
                <div className="rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-2 text-sm text-amber-900">
                  Fallback: {debug.fallback.reason}
                </div>
              ) : null}

              <DebugSection title="Providers & cache">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <StatRow
                      label="Used providers"
                      value={
                        debug?.usedProviders?.length
                          ? debug.usedProviders.join(", ")
                          : "—"
                      }
                    />
                    <StatRow
                      label="Cache hits"
                      value={
                        debug?.cacheHits
                          ? Object.entries(debug.cacheHits)
                              .map(([key, value]) => `${key}: ${value ? "hit" : "miss"}`)
                              .join(" · ")
                          : "—"
                      }
                    />
                    <StatRow
                      label="Hashes"
                      value={
                        debug?.hashes
                          ? Object.entries(debug.hashes)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(" · ")
                          : "—"
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                      Provider performance
                    </p>
                    {Object.keys(providerStats).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No provider metrics.</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(providerStats).map(([provider, info]) => (
                          <div
                            key={provider}
                            className="rounded-lg border border-border/80 bg-background/80 p-3 shadow-inner shadow-black/5"
                          >
                            <div className="flex items-center justify-between text-sm font-semibold">
                              <span>{provider}</span>
                              {info?.cacheHit !== undefined ? (
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                                    info.cacheHit ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground",
                                  )}
                                >
                                  {info.cacheHit ? "cache" : "fresh"}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                              <div className="rounded-lg bg-muted/60 px-2 py-1">
                                <p className="text-[10px] uppercase tracking-[0.12em]">Count</p>
                                <p className="text-sm font-semibold text-foreground">
                                  {info?.count ?? "—"}
                                </p>
                              </div>
                              <div className="rounded-lg bg-muted/60 px-2 py-1">
                                <p className="text-[10px] uppercase tracking-[0.12em]">Latency</p>
                                <p className="text-sm font-semibold text-foreground">
                                  {info?.ms != null ? `${info.ms} ms` : "—"}
                                </p>
                              </div>
                              <div className="rounded-lg bg-muted/60 px-2 py-1">
                                <p className="text-[10px] uppercase tracking-[0.12em]">Error</p>
                                <p className="text-sm font-semibold text-foreground">
                                  {info?.error ?? "—"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </DebugSection>

              <DebugSection
                title="Ingestion & embeddings"
                description="Track how content is ingested and embedded before semantic retrieval."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                      Ingestion
                    </p>
                    <StatRow label="Upserted" value={debug?.ingestion?.upserted ?? "—"} />
                    <StatRow label="Updated" value={debug?.ingestion?.updated ?? "—"} />
                    <StatRow label="Error" value={debug?.ingestion?.error ?? "—"} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                      Embeddings
                    </p>
                    <StatRow label="Interest missing" value={debug?.embeddings?.interestMissing ?? "—"} />
                    <StatRow label="Content missing" value={debug?.embeddings?.contentMissing ?? "—"} />
                    <StatRow label="Model" value={debug?.embeddings?.usedModel ?? "—"} />
                    <StatRow label="Error" value={debug?.embeddings?.error ?? "—"} />
                  </div>
                </div>
              </DebugSection>

              <DebugSection
                title="Semantic retrieval & LLM"
                description="Observe semantic search, reranking, and final filtering stages."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Semantic</p>
                    <StatRow label="Top K" value={debug?.semantic?.topK ?? "—"} />
                    <StatRow label="Latency" value={debug?.semantic?.latencyMs != null ? `${debug.semantic.latencyMs} ms` : "—"} />
                    <StatRow label="Model" value={debug?.semantic?.usedModel ?? "—"} />
                    <StatRow label="Cache" value={debug?.semantic?.cacheHit === undefined ? "—" : debug.semantic.cacheHit ? "hit" : "miss"} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">LLM</p>
                    <StatRow label="Filtered ads" value={debug?.llm?.filteredAd ?? "—"} />
                    <StatRow label="Filtered offtopic" value={debug?.llm?.filteredOfftopic ?? "—"} />
                    <StatRow label="Avg score" value={debug?.llm?.avgScore ?? "—"} />
                    <StatRow label="Latency" value={debug?.llm?.latencyMs != null ? `${debug.llm.latencyMs} ms` : "—"} />
                    <StatRow label="Model" value={debug?.llm?.usedModel ?? "—"} />
                    <StatRow label="Mode" value={debug?.llm?.mode ?? "—"} />
                    <StatRow label="Error" value={debug?.llm?.error ?? "—"} />
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Diversity</p>
                  <KeyValuePills
                    data={
                      debug?.diversity && {
                        droppedByProvider: debug.diversity.droppedByProvider,
                        droppedByChannel: debug.diversity.droppedByChannel,
                        enforcedProviders: debug.diversity.enforcedProviders,
                      }
                    }
                    emptyLabel="No diversity adjustments recorded."
                  />
                </div>
              </DebugSection>

              <DebugSection title="Sample items" description="First 5 items returned by the engine.">
                {sampleItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items to show.</p>
                ) : (
                  <div className="space-y-3">
                    {sampleItems.map((item) => (
                      <div
                        key={`${item.provider}:${item.id}`}
                        className="rounded-xl border border-border/80 bg-background/80 p-3 shadow-inner shadow-black/5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em]">
                            <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">{item.provider}</span>
                            <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">{item.type}</span>
                          </div>
                          {item.score != null ? (
                            <span className="text-xs font-semibold text-foreground">Score: {item.score.toFixed(2)}</span>
                          ) : null}
                        </div>
                        <h4 className="mt-2 text-sm font-semibold text-foreground">{item.title}</h4>
                        {item.url ? (
                          <a
                            className="text-xs text-primary underline underline-offset-4"
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {item.url}
                          </a>
                        ) : null}
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <p>
                            <span className="font-semibold text-foreground">Interests:</span>{" "}
                            {item.interestTitles?.length
                              ? item.interestTitles.join(", ")
                              : item.interestIds.join(", ")}
                          </p>
                          <p>
                            <span className="font-semibold text-foreground">Why:</span>{" "}
                            {item.why ?? item.whyText ?? "—"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DebugSection>

              {!debug ? (
                <p className="text-sm text-muted-foreground">
                  No debug payload was returned from the content engine. Make sure debug data is generated on the server.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ContentDebugPanel;
