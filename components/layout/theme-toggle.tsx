"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Mark as mounted to prevent hydration mismatch while allowing theme class application.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const isDark = (resolvedTheme ?? "dark") === "dark";

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <span className="text-lg" aria-hidden>
        {mounted ? (isDark ? "🌞" : "🌙") : "⏳"}
      </span>
      <span className="sr-only">
        {mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
      </span>
    </Button>
  );
};

export default ThemeToggle;
