"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    const onboarded = window.localStorage.getItem("hasOnboarded") === "true";
    router.replace(onboarded ? "/memory" : "/onboarding");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted">
      Перенаправляем…
    </div>
  );
}
