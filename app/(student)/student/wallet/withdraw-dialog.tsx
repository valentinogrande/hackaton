"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDownToLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { requestWithdrawal } from "./actions";

export function WithdrawDialog({ available }: { available: number }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState<string>("");
  const [destination, setDestination] = useState<string>("");

  const disabled = available <= 0;

  function submit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("amount", amount);
      fd.set("destination_value", destination.trim());
      const res = await requestWithdrawal(fd);
      if (res && "error" in res) {
        toast.error(res.error);
      } else {
        toast.success("Retiro solicitado");
        setOpen(false);
        setAmount("");
        setDestination("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" disabled={disabled}>
          <ArrowDownToLine className="size-4" />
          Retirar puntos
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retirar puntos</DialogTitle>
          <DialogDescription>
            Disponible: ${available.toFixed(2)}. La transferencia llega al
            alias o CBU que indiques.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="amount">Monto</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min={1}
              step={100}
              max={available > 0 ? available : undefined}
              placeholder={`Hasta $${available.toFixed(2)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="destination_value">Alias o CBU</Label>
            <Input
              id="destination_value"
              name="destination_value"
              placeholder="mi.alias.mp o CBU de 22 dígitos"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Te lo pedimos cada vez por seguridad.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Enviando..." : "Confirmar retiro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
