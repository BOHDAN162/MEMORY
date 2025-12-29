"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // The mounted flag prevents hydration mismatches when next-themes switches classes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const isDark = (resolvedTheme ?? "dark") === "dark";

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted ? (isDark ? "Switch to light" : "Switch to dark") : "Toggle theme"}
    </Button>
  );
};

export default ThemeToggle;
