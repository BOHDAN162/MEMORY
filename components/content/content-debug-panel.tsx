"use client";

import type { ReactNode } from "react";
import type { ContentDebugInfo } from "@/components/content/content-hub";
import type { ContentProviderId } from "@/lib/server/content/types";
import { cn } from "@/lib/utils/cn";

type ContentDebugPanelProps = {
  debug: ContentDebugInfo | null;
  selectionMode: "selected" | "all";
  interestIds: string[];
  availableProviders: ContentProviderId[];
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

const ContentDebugPanel = ({
  debug,
  selectionMode,
  interestIds,
  availableProviders,
  className,
}: ContentDebugPanelProps) => {
  const providersPayload = debug?.providers ?? {};
  const providerEntries = Object.entries(providersPayload);
  const shouldShowEmbedding = Boolean(debug?.embeddings);
  const shouldShowSemantic = Boolean(debug?.semantic);
  const shouldShowLlm = Boolean(debug?.llm);
  const shouldShowFallback = Boolean(debug?.fallback?.reason);

  return (
    <div className={cn("rounded-2xl border border-border bg-background shadow-sm shadow-black/5", className)}>
      <div className="border-b border-border/80 bg-muted/60 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Debug</p>
        <h2 className="text-lg font-semibold text-foreground">Content Debug Panel</h2>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <DebugSection title="Request" description="Selection mode and interest IDs sent to getContent.">
            <StatRow label="Selection mode" value={selectionMode} />
            <StatRow
              label="Interest IDs"
              value={interestIds.length > 0 ? interestIds.join(", ") : "—"}
            />
            <StatRow
              label="Available providers"
              value={availableProviders.length ? availableProviders.join(", ") : "—"}
            />
          </DebugSection>

          <DebugSection title="Providers summary" description="Aggregated provider metrics from debug.providers.">
            {providerEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No provider metrics.</p>
            ) : (
              <div className="space-y-3">
                {providerEntries.map(([provider, info]) => (
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
                        <p className="text-sm font-semibold text-foreground">{info?.count ?? "—"}</p>
                      </div>
                      <div className="rounded-lg bg-muted/60 px-2 py-1">
                        <p className="text-[10px] uppercase tracking-[0.12em]">Latency</p>
                        <p className="text-sm font-semibold text-foreground">
                          {info?.ms != null ? `${info.ms} ms` : "—"}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/60 px-2 py-1">
                        <p className="text-[10px] uppercase tracking-[0.12em]">Error</p>
                        <p className="text-sm font-semibold text-foreground">{info?.error ?? "—"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DebugSection>
        </div>

        {shouldShowFallback ? (
          <div className="rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            Fallback: {debug?.fallback?.reason}
          </div>
        ) : null}

        {shouldShowEmbedding || shouldShowSemantic || shouldShowLlm ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {shouldShowEmbedding ? (
              <DebugSection title="Embeddings">
                <StatRow label="Interest missing" value={debug?.embeddings?.interestMissing ?? "—"} />
                <StatRow label="Content missing" value={debug?.embeddings?.contentMissing ?? "—"} />
                <StatRow label="Model" value={debug?.embeddings?.usedModel ?? "—"} />
                <StatRow label="Error" value={debug?.embeddings?.error ?? "—"} />
              </DebugSection>
            ) : null}

            {shouldShowSemantic ? (
              <DebugSection title="Semantic">
                <StatRow label="Top K" value={debug?.semantic?.topK ?? "—"} />
                <StatRow
                  label="Latency"
                  value={debug?.semantic?.latencyMs != null ? `${debug.semantic.latencyMs} ms` : "—"}
                />
                <StatRow label="Model" value={debug?.semantic?.usedModel ?? "—"} />
                <StatRow
                  label="Cache"
                  value={
                    debug?.semantic?.cacheHit === undefined
                      ? "—"
                      : debug.semantic.cacheHit
                        ? "hit"
                        : "miss"
                  }
                />
              </DebugSection>
            ) : null}

            {shouldShowLlm ? (
              <DebugSection title="LLM">
                <StatRow label="Filtered ads" value={debug?.llm?.filteredAd ?? "—"} />
                <StatRow label="Filtered offtopic" value={debug?.llm?.filteredOfftopic ?? "—"} />
                <StatRow label="Avg score" value={debug?.llm?.avgScore ?? "—"} />
                <StatRow
                  label="Latency"
                  value={debug?.llm?.latencyMs != null ? `${debug.llm.latencyMs} ms` : "—"}
                />
                <StatRow label="Model" value={debug?.llm?.usedModel ?? "—"} />
                <StatRow label="Mode" value={debug?.llm?.mode ?? "—"} />
                <StatRow label="Error" value={debug?.llm?.error ?? "—"} />
              </DebugSection>
            ) : null}
          </div>
        ) : null}

        {debug?.diversity ? (
          <DebugSection title="Diversity">
            <KeyValuePills
              data={{
                droppedByProvider: debug.diversity.droppedByProvider,
                droppedByChannel: debug.diversity.droppedByChannel,
                enforcedProviders: debug.diversity.enforcedProviders,
              }}
              emptyLabel="No diversity adjustments recorded."
            />
          </DebugSection>
        ) : null}

        <DebugSection title="Raw JSON" description="Full debug payload returned by the server.">
          <pre className="max-h-72 overflow-auto rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            {JSON.stringify(debug, null, 2)}
          </pre>
        </DebugSection>
      </div>
    </div>
  );
};

export default ContentDebugPanel;
