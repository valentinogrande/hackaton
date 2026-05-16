"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LivePoolRefresher({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    tickRef.current = window.setInterval(() => {
      startTransition(() => router.refresh());
    }, intervalMs);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [router, intervalMs]);

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
    >
      <RefreshCw className={pending ? "size-3.5 animate-spin" : "size-3.5"} />
      {pending ? "Actualizando..." : "Actualizar"}
    </Button>
  );
}
