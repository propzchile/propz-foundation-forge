import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import type { PartyType } from "@/lib/propz/domain";

export type OwnerFormValues = {
  display_name: string;
  party_type: PartyType;
  legal_name: string | null;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

type OwnerFormProps = {
  mode: "create" | "edit";
  initialValues?: Partial<OwnerFormValues>;
  pending?: boolean;
  onSubmit: (values: OwnerFormValues) => void | Promise<void>;
};

const EMPTY = {
  display_name: "",
  party_type: "natural" as PartyType,
  legal_name: "",
  tax_id: "",
  email: "",
  phone: "",
  notes: "",
};

export function OwnerForm({ mode, initialValues, pending, onSubmit }: OwnerFormProps) {
  const [form, setForm] = useState({
    ...EMPTY,
    ...Object.fromEntries(
      Object.entries(initialValues ?? {}).map(([k, v]) => [k, v ?? ""]),
    ),
  } as typeof EMPTY);

  const isCompany = form.party_type === "empresa";

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pending) return;
        await onSubmit({
          display_name: form.display_name.trim(),
          party_type: form.party_type,
          legal_name: isCompany ? form.legal_name.trim() || null : null,
          tax_id: form.tax_id.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          notes: form.notes.trim() || null,
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

      {isCompany && (
        <div className="space-y-2">
          <Label>Razón social</Label>
          <Input
            value={form.legal_name}
            onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>{isCompany ? "Nombre visible" : "Nombre y apellido"}</Label>
        <Input
          required
          value={form.display_name}
          onChange={(e) => setForm({ ...form, display_name: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>RUT</Label>
          <Input
            value={form.tax_id}
            onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Teléfono</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
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

      <div className="space-y-2">
        <Label>Notas</Label>
        <Textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending
            ? "Guardando…"
            : mode === "create"
              ? "Crear"
              : "Guardar cambios"}
        </Button>
      </DialogFooter>
    </form>
  );
}
