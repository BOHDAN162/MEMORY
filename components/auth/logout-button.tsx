"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

type LogoutButtonProps = {
  className?: string;
};

export const LogoutButton = ({ className }: LogoutButtonProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, startTransition] = useTransition();
  const router = useRouter();

  const handleLogout = async () => {
    setError(null);

    startTransition(() => {
      logout()
        .then((result) => {
          if (result?.error) {
            setError(result.error);
            return;
          }

          router.push("/auth");
          router.refresh();
        })
        .catch(() => {
          setError("Не удалось выйти. Попробуйте ещё раз.");
        });
    });
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
