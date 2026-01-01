import { NextResponse } from "next/server";

import { clusterKey } from "@/lib/map/auto-layout";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Interest } from "@/lib/types";

export const dynamic = "force-dynamic";

type Recommendation = {
  id: string;
  title: string;
  cluster: string | null;
  clusterLabel: string;
  score: number;
};

const normalizeInterests = (interests: Interest[]) =>
  interests.map((interest) => ({
    ...interest,
    synonyms: Array.isArray(interest.synonyms)
      ? interest.synonyms.filter((synonym) => typeof synonym === "string")
      : [],
  }));

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/i)
    .map((token) => token.trim())
    .filter(Boolean);

const collectTokens = (interest: Interest) => {
  const tokens = new Set<string>();
  tokenize(interest.title).forEach((token) => tokens.add(token));
  (interest.synonyms ?? []).forEach((synonym) => {
    tokenize(synonym).forEach((token) => tokens.add(token));
  });
  return tokens;
};

const parseIds = (value: string | null) =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

const SCORE_CAP = 3;

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase client is not configured. Check environment variables." },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const selectedIds = parseIds(url.searchParams.get("ids"));
  const presentIds = new Set(parseIds(url.searchParams.get("present")));
  const selectedSet = new Set(selectedIds);

  const { data: authUser, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("interests")
    .select("id, slug, title, cluster, synonyms")
    .order("cluster", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const interests = normalizeInterests(data ?? []);
  const selectedInterests = interests.filter((interest) => selectedSet.has(interest.id));
  const selectedClusters = new Set(
    selectedInterests.map((interest) => interest.cluster).filter(Boolean) as string[],
  );

  const selectedTokens = new Set<string>();
  selectedInterests.forEach((interest) => {
    collectTokens(interest).forEach((token) => selectedTokens.add(token));
  });

  const scores: Recommendation[] = interests
    .filter((interest) => !selectedSet.has(interest.id) && !presentIds.has(interest.id))
    .map((interest) => {
      let score = 0;
      if (interest.cluster && selectedClusters.has(interest.cluster)) {
        score += 2;
      }

      const overlap = Array.from(collectTokens(interest)).filter((token) =>
        selectedTokens.has(token),
      ).length;

      if (overlap > 0) {
        score += Math.min(overlap, SCORE_CAP);
      }

      return {
        id: interest.id,
        title: interest.title,
        cluster: interest.cluster,
        clusterLabel: clusterKey(interest.cluster),
        score,
      };
    })
    .filter((item) => item.score > 0 || selectedSet.size === 0);

  const fallback = interests
    .filter((interest) => !selectedSet.has(interest.id) && !presentIds.has(interest.id))
    .slice(0, 32)
    .map((interest) => ({
      id: interest.id,
      title: interest.title,
      cluster: interest.cluster,
      clusterLabel: clusterKey(interest.cluster),
      score: 0,
    }));

  const sorted = (scores.length > 0 ? scores : fallback).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if ((b.cluster ?? "").localeCompare(a.cluster ?? "") !== 0) {
      return (a.cluster ?? "").localeCompare(b.cluster ?? "");
    }
    return a.title.localeCompare(b.title);
  });

  const limit = Math.min(20, Math.max(8, sorted.length));
  const recommendations = sorted.slice(0, limit);

  return NextResponse.json(
    { recommendations },
    { headers: { "Cache-Control": "private, max-age=600" } },
  );
}
