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
import type { PartyType } from "@/lib/propz/domain";

export type TenantFormValues = {
  first_name: string;
  last_name: string;
  party_type: PartyType;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
};

type Props = {
  mode: "create" | "edit";
  initialValues?: Partial<TenantFormValues>;
  pending?: boolean;
  onSubmit: (values: TenantFormValues) => void | Promise<void>;
};

const EMPTY = {
  first_name: "",
  last_name: "",
  party_type: "natural" as PartyType,
  tax_id: "",
  email: "",
  phone: "",
};

export function TenantForm({ mode, initialValues, pending, onSubmit }: Props) {
  const [form, setForm] = useState({
    ...EMPTY,
    ...Object.fromEntries(Object.entries(initialValues ?? {}).map(([k, v]) => [k, v ?? ""])),
  } as typeof EMPTY);
  const [error, setError] = useState<string | null>(null);
  const isCompany = form.party_type === "empresa";

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pending) return;
        if (!form.last_name.trim()) {
          setError(isCompany ? "Indica la razón social." : "Indica el apellido.");
          return;
        }
        setError(null);
        await onSubmit({
          first_name: isCompany ? "" : form.first_name.trim(),
          last_name: form.last_name.trim(),
          party_type: form.party_type,
          tax_id: form.tax_id.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
        });
      }}
    >
      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select
          value={form.party_type}
          onValueChange={(v) => setForm({ ...form, party_type: v as PartyType })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="natural">Persona natural</SelectItem>
            <SelectItem value="empresa">Empresa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {!isCompany && (
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label>{isCompany ? "Razón social" : "Apellido"}</Label>
          <Input
            required
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>RUT</Label>
          <Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Teléfono</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : mode === "create" ? "Crear arrendatario" : "Guardar cambios"}
        </Button>
      </DialogFooter>
    </form>
  );
}
