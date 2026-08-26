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
import { PROPERTY_TYPES, titleCase, type PropertyType } from "@/lib/propz/domain";

export type PropertyFormValues = {
  alias: string;
  property_type: PropertyType;
  address: string;
  comuna: string | null;
  city: string | null;
  region: string | null;
  country: string;
};

type Props = {
  mode: "create" | "edit";
  initialValues?: Partial<PropertyFormValues>;
  pending?: boolean;
  onSubmit: (values: PropertyFormValues) => void | Promise<void>;
};

const EMPTY = {
  alias: "",
  property_type: "departamento" as PropertyType,
  address: "",
  comuna: "",
  city: "",
  region: "",
  country: "Chile",
};

export function PropertyForm({ mode, initialValues, pending, onSubmit }: Props) {
  const [form, setForm] = useState({
    ...EMPTY,
    ...Object.fromEntries(
      Object.entries(initialValues ?? {}).map(([k, v]) => [k, v ?? ""]),
    ),
  } as typeof EMPTY);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pending) return;
        if (!form.alias.trim()) return setError("Ponle un nombre para reconocerla.");
        if (!form.address.trim()) return setError("La dirección es obligatoria.");
        setError(null);
        await onSubmit({
          alias: form.alias.trim(),
          property_type: form.property_type,
          address: form.address.trim(),
          comuna: form.comuna.trim() || null,
          city: form.city.trim() || null,
          region: form.region.trim() || null,
          country: form.country.trim() || "Chile",
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Nombre o alias</Label>
          <Input
            required
            placeholder="Ej: Depto Providencia"
            value={form.alias}
            onChange={(e) => setForm({ ...form, alias: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select
            value={form.property_type}
            onValueChange={(v) => setForm({ ...form, property_type: v as PropertyType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {titleCase(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Dirección</Label>
        <Input
          required
          placeholder="Calle, número, depto"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Comuna</Label>
          <Input
            value={form.comuna}
            onChange={(e) => setForm({ ...form, comuna: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Ciudad</Label>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Región</Label>
          <Input
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : mode === "create" ? "Crear propiedad" : "Guardar cambios"}
        </Button>
      </DialogFooter>
    </form>
  );
}
