"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDownToLine } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requestWithdrawal } from "./actions";

type DestType = "cbu" | "alias";

const DEST_LABEL: Record<DestType, string> = {
  cbu: "CBU",
  alias: "Alias",
};

export function WithdrawForm({
  hasCbu,
  hasAlias,
  available,
}: {
  hasCbu: boolean;
  hasAlias: boolean;
  available: number;
}) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [destination, setDestination] = useState<DestType>(
    hasCbu ? "cbu" : hasAlias ? "alias" : "cbu"
  );

  const canSubmit = (destination === "cbu" && hasCbu) || (destination === "alias" && hasAlias);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowDownToLine className="size-4" />
          Solicitar retiro
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
          action={(fd) =>
            startTransition(async () => {
              fd.set("destination_type", destination);
              const res = await requestWithdrawal(fd);
              if (res && "error" in res) toast.error(res.error);
              else {
                toast.success("Retiro solicitado");
                formRef.current?.reset();
              }
            })
          }
        >
          <div className="space-y-1">
            <Label htmlFor="amount">Monto</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min={1}
              step={100}
              max={available > 0 ? available : undefined}
              placeholder={available > 0 ? `Hasta $${available}` : "0"}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Cobrar en</Label>
            <Select
              value={destination}
              onValueChange={(v) => v && setDestination(v as DestType)}
            >
              <SelectTrigger>
                <SelectValue>{DEST_LABEL[destination]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cbu" disabled={!hasCbu}>
                  CBU {hasCbu ? "" : "(falta cargar)"}
                </SelectItem>
                <SelectItem value="alias" disabled={!hasAlias}>
                  Alias {hasAlias ? "" : "(falta cargar)"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={pending || !canSubmit}>
            <ArrowDownToLine className="size-4" />
            {pending ? "Enviando..." : "Pedir retiro"}
          </Button>
        </form>
        {!hasCbu && !hasAlias && (
          <p className="text-xs text-muted-foreground mt-3">
            Cargá tu CBU o alias arriba para poder retirar.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
