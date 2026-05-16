"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startStudySession } from "./actions";

export function StudyButton({ materialId }: { materialId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await startStudySession(materialId);
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
          <Loader2 className="size-4 animate-spin" />
          Generando preguntas...
        </>
      ) : (
        <>
          <Sparkles className="size-4" />
          Study · IA
        </>
      )}
    </Button>
  );
}
