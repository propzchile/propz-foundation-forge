import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, EmptyState, StatusBadge } from "@/components/propz/app-shell";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateUnit, useOwner, useProperty, useUnits } from "@/lib/propz/queries";
import {
  RENTAL_MODES,
  UNIT_TYPES,
  titleCase,
  type UnitRentalMode,
  type UnitType,
} from "@/lib/propz/domain";

export const Route = createFileRoute("/_authenticated/propiedades/$propertyId")({
  head: () => ({
    meta: [
      { title: "Detalle de propiedad — Propz" },
      {
        name: "description",
        content: "Datos de la propiedad y listado de unidades arrendables asociadas.",
      },
      { property: "og:title", content: "Detalle de propiedad — Propz" },
      {
        property: "og:description",
        content: "Unidades, modo de arriendo y contratos vinculados a la propiedad.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PropertyDetail,
});

function PropertyDetail() {
  const { propertyId } = Route.useParams();
  const property = useProperty(propertyId);
  const owner = useOwner(property.data?.owner_id ?? "");
  const units = useUnits(propertyId);

  return (
    <AppShell
      title={property.data?.alias ?? "Propiedad"}
      description={
        property.data
          ? `${titleCase(property.data.property_type)} · ${property.data.address}${property.data.comuna ? `, ${property.data.comuna}` : ""}`
          : "Cargando…"
      }
      crumbs={[
        { label: "Inicio", to: "/panel" },
        { label: "Propietarios", to: "/propietarios" },
        ...(property.data
          ? [
              {
                label: owner.data?.display_name ?? "Propietario",
                to: "/propietarios/$ownerId",
                params: { ownerId: property.data.owner_id },
              },
            ]
          : []),
        { label: property.data?.alias ?? "…" },
      ]}
      actions={<NewUnitDialog propertyId={propertyId} />}
    >
      <h2 className="mb-3 text-lg font-semibold">Unidades</h2>
      {(units.data?.length ?? 0) === 0 ? (
        <EmptyState
          title="Sin unidades"
          hint="Toda propiedad necesita al menos una unidad para poder arrendarse."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {units.data!.map((u) => (
            <Link
              key={u.id}
              to="/unidades/$unitId"
              params={{ unitId: u.id }}
              className="surface-card block p-4 transition-colors hover:border-accent"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{u.alias || u.identifier}</span>
                <StatusBadge status={u.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {titleCase(u.unit_type)} · {u.identifier} ·{" "}
                {RENTAL_MODES.find((m) => m.value === u.rental_mode)?.label ?? u.rental_mode}
              </p>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function NewUnitDialog({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const create = useCreateUnit();
  const [form, setForm] = useState({
    identifier: "",
    alias: "",
    unit_type: "departamento" as UnitType,
    rental_mode: "completa" as UnitRentalMode,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nueva unidad</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva unidad</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await create.mutateAsync({
                property_id: propertyId,
                identifier: form.identifier,
                alias: form.alias || null,
                unit_type: form.unit_type,
                rental_mode: form.rental_mode,
              });
              toast.success("Unidad creada");
              setOpen(false);
            } catch (err) {
              toast.error((err as Error).message);
            }
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Identificador</Label>
              <Input
                required
                placeholder="Ej: 1201"
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Alias</Label>
              <Input
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
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
