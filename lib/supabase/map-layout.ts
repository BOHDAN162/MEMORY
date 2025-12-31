import type { SupabaseClient } from "@supabase/supabase-js";

type MapLayoutPosition = {
  interestId: string;
  x: number;
  y: number;
};

export const getMapLayoutForUser = async (
  supabase: SupabaseClient,
  userId: string,
  interestIds: string[],
) => {
  const filteredIds = Array.from(new Set(interestIds.filter(Boolean)));

  const query = supabase
    .from("map_layout")
    .select("interest_id, x, y")
    .eq("user_id", userId);

  if (filteredIds.length > 0) {
    query.in("interest_id", filteredIds);
  }

  return query;
};

export const upsertMapLayoutPositions = async (
  supabase: SupabaseClient,
  userId: string,
  positions: MapLayoutPosition[],
) => {
  if (positions.length === 0) {
    return { error: null };
  }

  const normalized = positions
    .map((item) => ({
      interest_id: item.interestId,
      x: Number(item.x),
      y: Number(item.y),
    }))
    .filter(
      (item) =>
        Boolean(item.interest_id) && Number.isFinite(item.x) && Number.isFinite(item.y),
    );

  if (normalized.length === 0) {
    return { error: "No valid coordinates provided." };
  }

  return supabase.from("map_layout").upsert(
    normalized.map((item) => ({
      user_id: userId,
      interest_id: item.interest_id,
      x: item.x,
      y: item.y,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "user_id,interest_id" },
  );
};
