import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserIdByAuthUserId } from "@/lib/server/interests";
import type { MapInterestNode, ServiceResponse } from "@/lib/types";

export const getCurrentUserMapNodes = async (): Promise<
  ServiceResponse<MapInterestNode[]>
> => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      data: null,
      error: "Supabase client is not configured. Check environment variables.",
    };
  }

  const { data: authUser, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser?.user) {
    return { data: [], error: "Not authenticated" };
  }

  const { data: userId, error: userIdError } = await getUserIdByAuthUserId(
    supabase,
    authUser.user,
  );

  if (userIdError || !userId) {
    return { data: null, error: userIdError ?? "Unable to ensure user profile." };
  }

  const { data: interestRows, error: interestError } = await supabase
    .from("user_interests")
    .select("interest:interests(id, slug, title, cluster)")
    .eq("user_id", userId);

  if (interestError) {
    return { data: null, error: interestError.message };
  }

  const { data: layoutRows, error: layoutError } = await supabase
    .from("map_layout")
    .select("interest_id, x, y")
    .eq("user_id", userId);

  if (layoutError) {
    return { data: null, error: layoutError.message };
  }

  const layoutMap = new Map(
    (layoutRows ?? [])
      .filter((row) => typeof row.interest_id === "string")
      .map((row) => [
        row.interest_id as string,
        row.x != null && row.y != null ? { x: row.x, y: row.y } : null,
      ]),
  );

  type InterestRow = {
    interest?:
      | {
          id: string;
          slug: string;
          title: string;
          cluster: string | null;
        }
      | Array<{
          id: string;
          slug: string;
          title: string;
          cluster: string | null;
        }>
      | null;
  };

  const mapNodes: MapInterestNode[] =
    interestRows
      ?.map((row) => {
        const interestData = (row as InterestRow).interest;
        const interest = Array.isArray(interestData) ? interestData[0] : interestData;
        if (!interest) return null;

        return {
          id: interest.id,
          title: interest.title,
          cluster: interest.cluster ?? null,
          position: layoutMap.get(interest.id) ?? null,
        } satisfies MapInterestNode;
      })
      .filter((interest): interest is MapInterestNode => Boolean(interest)) ?? [];

  mapNodes.sort((a, b) => {
    const clusterA = a.cluster ?? "";
    const clusterB = b.cluster ?? "";

    if (clusterA.localeCompare(clusterB) !== 0) {
      return clusterA.localeCompare(clusterB);
    }

    return a.title.localeCompare(b.title);
  });

  return { data: mapNodes, error: null };
};
