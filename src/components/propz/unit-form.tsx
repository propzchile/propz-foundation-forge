import { useState } from "react";

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
import { DialogFooter } from "@/components/ui/dialog";
import {
  RENTAL_MODES,
  UNIT_TYPES,
  titleCase,
  type UnitRentalMode,
  type UnitType,
} from "@/lib/propz/domain";

export type UnitFormValues = {
  identifier: string;
  alias: string | null;
  unit_type: UnitType;
  rental_mode: UnitRentalMode;
  parent_unit_id: string | null;
};

type ParentOption = { id: string; label: string };

type Props = {
  mode: "create" | "edit";
  initialValues?: Partial<UnitFormValues>;
  parentOptions?: ParentOption[];
  pending?: boolean;
  onSubmit: (values: UnitFormValues) => void | Promise<void>;
};

const NONE = "__none__";

const EMPTY = {
  identifier: "",
  alias: "",
  unit_type: "departamento" as UnitType,
  rental_mode: "independiente" as UnitRentalMode,
  parent_unit_id: NONE,
};

export function UnitForm({ mode, initialValues, parentOptions = [], pending, onSubmit }: Props) {
  const [form, setForm] = useState({
    ...EMPTY,
    ...Object.fromEntries(
      Object.entries(initialValues ?? {}).map(([k, v]) => [
        k,
        k === "parent_unit_id" ? (v ?? NONE) : (v ?? ""),
      ]),
    ),
  } as typeof EMPTY);
  const [error, setError] = useState<string | null>(null);

  const showParent = form.rental_mode === "parte_de_conjunto" && parentOptions.length > 0;

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pending) return;
        const identifier = form.identifier.trim();
        if (identifier.length < 1) return setError("Escribe un identificador (ej: 802, E-45).");
        if (form.rental_mode === "parte_de_conjunto") {
          if (parentOptions.length === 0)
            return setError(
              "No hay una unidad principal disponible. Primero crea una unidad con modo «Se arrienda en conjunto».",
            );
          if (form.parent_unit_id === NONE)
            return setError("Selecciona la unidad principal de la que forma parte.");
        }
        setError(null);
        await onSubmit({
          identifier,
          alias: form.alias.trim() || null,
          unit_type: form.unit_type,
          rental_mode: form.rental_mode,
          parent_unit_id:
            showParent && form.parent_unit_id !== NONE ? form.parent_unit_id : null,
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Identificador</Label>
          <Input
            required
            placeholder="Ej: 802"
            value={form.identifier}
            onChange={(e) => setForm({ ...form, identifier: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Alias (opcional)</Label>
          <Input
            placeholder="Ej: Depto 802"
            value={form.alias}
            onChange={(e) => setForm({ ...form, alias: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tipo de unidad</Label>
        <Select
          value={form.unit_type}
          onValueChange={(v) => setForm({ ...form, unit_type: v as UnitType })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNIT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {titleCase(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Modo de arriendo</Label>
        <Select
          value={form.rental_mode}
          onValueChange={(v) => setForm({ ...form, rental_mode: v as UnitRentalMode })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RENTAL_MODES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {form.rental_mode === "parte_de_conjunto" &&
        (parentOptions.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No hay una unidad principal disponible en esta propiedad. Primero crea una unidad con
            modo «Se arrienda en conjunto» (ej: Depto 703) y luego vincula esta unidad a ella.
          </p>
        ) : (
          <div className="space-y-2">
            <Label>Unidad principal del conjunto</Label>
            <Select
              value={form.parent_unit_id}
              onValueChange={(v) => setForm({ ...form, parent_unit_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la unidad principal" />
              </SelectTrigger>
              <SelectContent>
                {parentOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Esta unidad se arrendará siempre junto con la unidad principal seleccionada.
            </p>
          </div>
        ))}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : mode === "create" ? "Crear unidad" : "Guardar cambios"}
        </Button>
      </DialogFooter>
    </form>
  );
}
