"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createPeriod,
  recomputeScores,
  markWithdrawalPaid,
} from "./actions";

type School = { id: string; name: string };

export function PeriodForm({ schools }: { schools: School[] }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [schoolId, setSchoolId] = useState<string>(schools[0]?.id ?? "");
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <form
      ref={formRef}
      className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
      action={(fd) =>
        startTransition(async () => {
          fd.set("school_id", schoolId);
          const res = await createPeriod(fd);
          if ("error" in res) toast.error(res.error);
          else {
            toast.success("Período creado");
            formRef.current?.reset();
          }
        })
      }
    >
      <div className="space-y-1">
        <Label>Colegio</Label>
        <Select value={schoolId} onValueChange={(v) => setSchoolId(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Elegir...">
              {schoolId
                ? schools.find((s) => s.id === schoolId)?.name ?? null
                : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {schools.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="period">Período (YYYY-MM)</Label>
        <Input
          id="period"
          name="period"
          placeholder="2026-05"
          defaultValue={defaultPeriod}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pool_amount">Pool ($)</Label>
        <Input
          id="pool_amount"
          name="pool_amount"
          type="number"
          min={0}
          step={100}
          placeholder="10000"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        <Plus className="size-4" />
        {pending ? "Creando..." : "Crear período"}
      </Button>
    </form>
  );
}

export function RecomputeButton({ periodId }: { periodId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await recomputeScores(periodId);
          if ("error" in res) toast.error(res.error);
          else toast.success("Pools recalculados");
        })
      }
    >
      <RefreshCw className={pending ? "size-3.5 animate-spin" : "size-3.5"} />
      Recalcular
    </Button>
  );
}

export function PayWithdrawalButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await markWithdrawalPaid(id);
          if ("error" in res) toast.error(res.error);
          else toast.success("Marcado como pagado");
        })
      }
    >
      <Check className="size-3.5" />
      Pagar
    </Button>
  );
}
