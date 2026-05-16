"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Brain } from "lucide-react";
import { startStudySession } from "./actions";

export function StudyButton({ materialId }: { materialId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
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
      className="inline-flex items-center gap-2 bg-violet-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-[0_3px_0_0_#5b21b6] hover:-translate-y-px transition-transform disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Generando...
        </>
      ) : (
        <>
          <Brain className="size-4" />
          Estudiar
        </>
      )}
    </button>
  );
}
