import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Settings } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate, formatMoney } from "@/lib/propz/domain";

export type ChargeConcept = "gastos_comunes" | "agua" | "luz" | "gas";
export const CHARGE_CONCEPTS: { value: ChargeConcept; label: string }[] = [
  { value: "gastos_comunes", label: "Gastos comunes" },
  { value: "agua", label: "Agua" },
  { value: "luz", label: "Luz" },
  { value: "gas", label: "Gas" },
];

export type ReferenceCharge = {
  id: string;
  unit_id: string;
  concept: ChargeConcept;
  monthly_amount: number;
  currency: string;
  effective_from: string;
};

export type Thresholds = { rent_days: number; common_months: number; utilities_months: number };
export const DEFAULT_THRESHOLDS: Thresholds = {
  rent_days: 15,
  common_months: 2,
  utilities_months: 2,
};

/** Historial completo de valores de referencia (más reciente primero). */
export function useReferenceCharges(unitId?: string) {
  return useQuery({
    queryKey: ["propz", "reference-charges", unitId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("unit_reference_charges" as never)
        .select("id, unit_id, concept, monthly_amount, currency, effective_from")
        .order("effective_from", { ascending: false })
        .order("created_at", { ascending: false });
      if (unitId) q = q.eq("unit_id", unitId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ReferenceCharge[];
    },
  });
}

/** Valor vigente por unidad y concepto. */
export function currentCharges(rows: ReferenceCharge[]) {
  const map = new Map<string, ReferenceCharge>();
  for (const r of rows) {
    const k = `${r.unit_id}:${r.concept}`;
    if (!map.has(k)) map.set(k, r);
  }
  return map;
}

export function useAddReferenceCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      unit_id: string;
      concept: ChargeConcept;
      monthly_amount: number;
      effective_from: string;
    }) => {
      const { error } = await supabase.from("unit_reference_charges" as never).insert(v as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["propz", "reference-charges"] }),
  });
}

export function useThresholds(userId: string | null) {
  return useQuery({
    queryKey: ["propz", "thresholds", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_thresholds" as never)
        .select("rent_days, common_months, utilities_months")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Thresholds | null) ?? DEFAULT_THRESHOLDS;
    },
  });
}

export function useSaveThresholds(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: Thresholds) => {
      const { error } = await supabase
        .from("dashboard_thresholds" as never)
        .upsert({ user_id: userId, ...v } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["propz", "thresholds"] }),
  });
}

export function ThresholdsDialog({ userId }: { userId: string | null }) {
  const t = useThresholds(userId);
  const save = useSaveThresholds(userId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Thresholds>(DEFAULT_THRESHOLDS);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setForm(t.data ?? DEFAULT_THRESHOLDS);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Configuración de criticidad">
          <Settings className="size-4" /> Configuración
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Umbrales de criticidad</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          {(
            [
              ["rent_days", "Arriendo: días de atraso"],
              ["common_months", "Gastos comunes: meses de atraso"],
              ["utilities_months", "Agua/Luz/Gas: meses de atraso"],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="grid gap-1.5">
              <Label htmlFor={k}>{label}</Label>
              <Input
                id={k}
                type="number"
                min={0}
                value={form[k]}
                onChange={(e) =>
                  setForm({ ...form, [k]: Math.max(0, Number(e.target.value) || 0) })
                }
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button
            disabled={save.isPending}
            onClick={async () => {
              try {
                await save.mutateAsync(form);
                toast.success("Umbrales guardados");
                setOpen(false);
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Promedios mensuales de la unidad principal, con historial. */
export function ReferenceChargesCard({ unitId }: { unitId: string }) {
  const rows = useReferenceCharges(unitId);
  const add = useAddReferenceCharge();
  const current = currentCharges(rows.data ?? []);
  const [editing, setEditing] = useState<ChargeConcept | null>(null);
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));

  return (
    <section className="surface-card mb-8 p-5">
      <h2 className="text-base font-semibold">Promedios mensuales de referencia</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Se aplican a la unidad principal y a su conjunto. El arriendo se toma del contrato vigente.
      </p>
      <div className="mt-4 divide-y divide-border">
        {CHARGE_CONCEPTS.map(({ value, label }) => {
          const c = current.get(`${unitId}:${value}`);
          return (
            <div key={value} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">
                  {c
                    ? `${formatMoney(Number(c.monthly_amount), c.currency)} · desde ${formatDate(c.effective_from)}`
                    : "Sin valor"}
                </p>
              </div>
              {editing === value ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="w-28"
                    type="number"
                    min={0}
                    placeholder="Monto"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <Input
                    className="w-36"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                  <Button
                    size="sm"
                    disabled={add.isPending || amount === ""}
                    onClick={async () => {
                      try {
                        await add.mutateAsync({
                          unit_id: unitId,
                          concept: value,
                          monthly_amount: Number(amount),
                          effective_from: from,
                        });
                        toast.success("Valor actualizado");
                        setEditing(null);
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                  >
                    Guardar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(value);
                    setAmount(c ? String(c.monthly_amount) : "");
                  }}
                >
                  {c ? "Actualizar" : "Agregar"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
