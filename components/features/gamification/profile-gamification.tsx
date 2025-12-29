"use client";

import { useState } from "react";

import { BadgesGrid } from "./badges-grid";
import { ProgressCard } from "./progress-card";
import { getBadgesWithState } from "@/lib/gamification/achievements";
import { addXp, loadGamificationState, resetGamification } from "@/lib/gamification/store";
import type { GamificationState } from "@/lib/gamification/types";

export const ProfileGamification = () => {
  const [state, setState] = useState<GamificationState>(() => loadGamificationState());

  const handleAddXp = (delta: number) => {
    const updated = addXp(delta, "CUSTOM", { source: "profile-dev" });
    setState(updated);
  };

  const handleReset = () => {
    const resetState = resetGamification();
    setState(resetState);
  };

  const badges = getBadgesWithState(state.unlockedBadges);

  return (
    <div className="space-y-6">
      <ProgressCard state={state} onAddXp={handleAddXp} onReset={handleReset} />
      <BadgesGrid badges={badges} />
    </div>
  );
};
