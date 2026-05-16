"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startStudySession } from "./actions";
import type { Database } from "@/lib/database.types";

type Mode = Database["public"]["Enums"]["study_mode"];

export function StudyButton({
  materialId,
  mode,
  label,
  variant = "default",
}: {
  materialId: string;
  mode: Mode;
  label: string;
  variant?: "default" | "outline" | "secondary";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant={variant}
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await startStudySession(materialId, mode);
          if ("error" in res) {
            toast.error(res.error);
            return;
          }
          router.push(`/student/estudiar/${res.sessionId}`);
        })
      }
    >
      {pending ? (
        <>
          <Loader2 className="size-3 animate-spin" />
          Generando...
        </>
      ) : (
        label
      )}
    </Button>
  );
}
