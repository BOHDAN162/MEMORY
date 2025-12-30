"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type LogoutButtonProps = {
  className?: string;
};

export const LogoutButton = ({ className }: LogoutButtonProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const handleLogout = async () => {
    if (!supabase) {
      setError(
        "Supabase client is not configured. Проверьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        setError(signOutError.message);
        return;
      }

      router.push("/auth");
      router.refresh();
    } catch (signOutException) {
      console.error("Failed to sign out", signOutException);
      setError("Не удалось выйти. Попробуйте ещё раз.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={className}>
      <Button variant="soft" size="sm" onClick={() => void handleLogout()} disabled={isProcessing}>
        {isProcessing ? "Выходим..." : "Выйти"}
      </Button>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
};
