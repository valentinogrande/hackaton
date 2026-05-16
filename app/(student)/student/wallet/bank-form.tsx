"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Save, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateBankInfo } from "./actions";

export function BankInfoForm({
  initialCbu,
  initialAlias,
}: {
  initialCbu: string;
  initialAlias: string;
}) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="size-4" />
          Datos bancarios
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
          action={(fd) =>
            startTransition(async () => {
              const res = await updateBankInfo(fd);
              if (res && "error" in res) toast.error(res.error);
              else toast.success("Datos guardados");
            })
          }
        >
          <div className="space-y-1">
            <Label htmlFor="bank_cbu">CBU</Label>
            <Input
              id="bank_cbu"
              name="bank_cbu"
              placeholder="22 dígitos"
              defaultValue={initialCbu}
              inputMode="numeric"
              maxLength={22}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bank_alias">Alias</Label>
            <Input
              id="bank_alias"
              name="bank_alias"
              placeholder="mi.alias.mp"
              defaultValue={initialAlias}
            />
          </div>
          <Button type="submit" disabled={pending}>
            <Save className="size-4" />
            {pending ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
