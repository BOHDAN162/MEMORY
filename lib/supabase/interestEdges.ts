import type { SupabaseClient } from "@supabase/supabase-js";

export type ManualEdgeRow = {
  source_interest_id: string;
  target_interest_id: string;
  created_at?: string | null;
};

const normalizePair = (a: string, b: string): [string, string] => {
  if (a.localeCompare(b) <= 0) {
    return [a, b];
  }

  return [b, a];
};

const toPairKey = (a: string, b: string) => normalizePair(a, b).join("|");

export const getManualEdgesForUser = async (
  supabase: SupabaseClient,
  userId: string,
  interestIds?: string[],
) => {
  const { data, error } = await supabase
    .from("interest_edges")
    .select("source_interest_id, target_interest_id, created_at")
    .eq("user_id", userId);

  if (error) {
    return { data: null, error };
  }

  const interestSet =
    interestIds && interestIds.length > 0
      ? new Set(interestIds.filter(Boolean))
      : null;

  const unique = new Map<string, ManualEdgeRow>();

  (data ?? []).forEach((row) => {
    const source = row.source_interest_id;
    const target = row.target_interest_id;

    if (!source || !target || source === target) return;
    if (interestSet && (!interestSet.has(source) || !interestSet.has(target))) return;

    unique.set(toPairKey(source, target), {
      source_interest_id: source,
      target_interest_id: target,
      created_at: row.created_at ?? null,
    });
  });

  return { data: Array.from(unique.values()), error: null };
};

export const createManualEdge = async (
  supabase: SupabaseClient,
  userId: string,
  sourceId: string,
  targetId: string,
) => {
  if (!sourceId || !targetId) {
    return { data: null, error: "Source and target interest IDs are required." };
  }

  const [source, target] = normalizePair(sourceId, targetId);

  if (source === target) {
    return { data: null, error: "Нельзя соединить один и тот же интерес." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("interest_edges")
    .select("source_interest_id, target_interest_id")
    .eq("user_id", userId)
    .eq("source_interest_id", source)
    .eq("target_interest_id", target)
    .maybeSingle();

  if (fetchError && fetchError.code !== "PGRST116") {
    return { data: null, error: fetchError.message };
  }

  if (existing) {
    return {
      data: { source_interest_id: source, target_interest_id: target },
      error: null,
    };
  }

  const { error: insertError } = await supabase.from("interest_edges").insert({
    user_id: userId,
    source_interest_id: source,
    target_interest_id: target,
  });

  if (insertError) {
    return { data: null, error: insertError.message };
  }

  return {
    data: { source_interest_id: source, target_interest_id: target },
    error: null,
  };
};

export const deleteManualEdge = async (
  supabase: SupabaseClient,
  userId: string,
  sourceId: string,
  targetId: string,
) => {
  if (!sourceId || !targetId) {
    return { error: "Source and target interest IDs are required." };
  }

  const [source, target] = normalizePair(sourceId, targetId);
  const orFilter = `and(source_interest_id.eq.${source},target_interest_id.eq.${target}),and(source_interest_id.eq.${target},target_interest_id.eq.${source})`;

  const { error } = await supabase
    .from("interest_edges")
    .delete()
    .eq("user_id", userId)
    .or(orFilter);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
};

export const normalizeEdgePair = normalizePair;
