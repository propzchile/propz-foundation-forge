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
import {
  contractUnitIds,
  useContracts,
  useCreateContract,
  useAllUnits,
  useOwner,
  useOwners,
  useProperty,
  useProperties,
  useTenants,
  useUnit,
} from "@/lib/propz/queries";
import {
  CONTRACT_STATUSES,
  PERIODICITIES,
  RENTAL_MODES,
  formatDate,
  formatMoney,
  isHistoric,
  tenantName,
  titleCase,
  type ContractPeriodicity,
  type ContractStatus,
} from "@/lib/propz/domain";

export const Route = createFileRoute("/_authenticated/unidades/$unitId")({
  head: () => ({
    meta: [
      { title: "Detalle de unidad — Propz" },
      {
        name: "description",
        content:
          "Unidad arrendable con su contrato vigente y el historial completo de contratos anteriores.",
      },
      { property: "og:title", content: "Detalle de unidad — Propz" },
      {
        property: "og:description",
        content: "Contrato vigente, historial y datos de la unidad arrendable.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UnitDetail,
});

function UnitDetail() {
  const { unitId } = Route.useParams();
  const unit = useUnit(unitId);
  const property = useProperty(unit.data?.property_id ?? "");
  const owner = useOwner(property.data?.owner_id ?? "");
  const contracts = useContracts({ unitId });

  const current = contracts.data?.filter((c) => !isHistoric(c.status)) ?? [];
  const history = contracts.data?.filter((c) => isHistoric(c.status)) ?? [];

  return (
    <AppShell
      title={unit.data?.alias || unit.data?.identifier || "Unidad"}
      description={
        unit.data
          ? `${titleCase(unit.data.unit_type)} · ${RENTAL_MODES.find((m) => m.value === unit.data!.rental_mode)?.label}`
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
              {
                label: property.data.alias,
                to: "/propiedades/$propertyId",
                params: { propertyId: property.data.id },
              },
            ]
          : []),
        { label: unit.data?.identifier ?? "…" },
      ]}
      actions={
        property.data && unit.data ? (
          <NewContractDialog
            ownerId={property.data.owner_id}
            propertyId={property.data.id}
            unitId={unit.data.id}
          />
        ) : null
      }
    >
      <h2 className="mb-3 text-lg font-semibold">Contrato vigente</h2>
      {current.length === 0 ? (
        <EmptyState title="Unidad sin contrato activo" hint="Crea un contrato para arrendarla." />
      ) : (
        <div className="space-y-3">
          {current.map((c) => (
            <ContractRow key={c.id} contract={c} />
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-10 text-lg font-semibold">Historial</h2>
      {history.length === 0 ? (
        <EmptyState title="Sin contratos históricos" />
      ) : (
        <div className="space-y-3">
          {history.map((c) => (
            <ContractRow key={c.id} contract={c} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function ContractRow({
  contract,
}: {
  contract: {
    id: string;
    status: string;
    start_date: string;
    end_date: string | null;
    rent_amount: number;
    currency: string;
    tenants: { first_name: string; last_name: string } | null;
  };
}) {
  return (
    <Link
      to="/contratos/$contractId"
      params={{ contractId: contract.id }}
      className="surface-card flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-accent"
    >
      <div>
        <div className="font-medium">
          {contract.tenants ? tenantName(contract.tenants) : "Sin arrendatario"}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDate(contract.start_date)} → {formatDate(contract.end_date)}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">
          {formatMoney(contract.rent_amount, contract.currency)}
        </span>
        <StatusBadge status={contract.status} />
      </div>
    </Link>
  );
}

export function NewContractDialog({
  ownerId,
  propertyId,
  unitId,
  label = "Nuevo contrato",
}: {
  ownerId?: string;
  propertyId?: string;
  unitId?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const create = useCreateContract();
  const owners = useOwners();
  const properties = useProperties();
  const units = useAllUnits();
  const contracts = useContracts({});
  const tenants = useTenants();
  const [selectedProperty, setSelectedProperty] = useState(propertyId ?? "");
  const [selectedUnit, setSelectedUnit] = useState(unitId ?? "");
  const [form, setForm] = useState({
    tenant_id: "",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: "",
    status: "ACTIVO" as ContractStatus,
    rent_amount: "",
    currency: "CLP",
    periodicity: "mensual" as ContractPeriodicity,
    due_day: "5",
  });
  const selectedTenant = tenants.data?.find((t) => t.id === form.tenant_id);
  const selectedOwnerId = ownerId ?? selectedTenant?.owner_id;
  const validProperties = (properties.data ?? []).filter(
    (p) => p.owner_id === selectedOwnerId && p.status !== "archivado" &&
      (owners.data ?? []).some((o) => o.id === p.owner_id && o.status !== "archivado"),
  );
  const occupiedIds = new Set((contracts.data ?? []).filter((c) => c.status === "ACTIVO").flatMap((c) => contractUnitIds(c)));
  const availableUnits = (units.data ?? []).filter((u) =>
    u.property_id === selectedProperty && u.status !== "archivado" && !occupiedIds.has(u.id),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{label}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo contrato</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!form.tenant_id) {
              toast.error("Selecciona un arrendatario");
              return;
            }
            const targetProperty = propertyId ?? selectedProperty;
            const targetUnit = unitId ?? selectedUnit;
            if (!selectedOwnerId || !targetProperty || !targetUnit ||
                (!propertyId && !validProperties.some((p) => p.id === targetProperty)) ||
                (!unitId && !availableUnits.some((u) => u.id === targetUnit))) {
              toast.error("Selecciona una propiedad y una unidad disponible");
              return;
            }
            try {
              const created = await create.mutateAsync({
                owner_id: selectedOwnerId,
                property_id: targetProperty,
                unit_id: targetUnit,
                tenant_id: form.tenant_id,
                start_date: form.start_date,
                end_date: form.end_date || null,
                status: form.status,
                rent_amount: Number(form.rent_amount),
                currency: form.currency,
                periodicity: form.periodicity,
                due_day: Number(form.due_day),
              });
              const extra = created.linked_unit_ids.length - 1;
              toast.success(
                extra > 0
                  ? `Contrato creado con ${extra + 1} unidades del conjunto`
                  : "Contrato creado",
              );
              setOpen(false);

            } catch (err) {
              toast.error((err as Error).message);
            }
          }}
        >
          <div className="space-y-2">
            <Label>Arrendatario</Label>
            <Select
              value={form.tenant_id}
              onValueChange={(v) => {
                setForm({ ...form, tenant_id: v });
                if (!ownerId) { setSelectedProperty(""); setSelectedUnit(""); }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona…" />
              </SelectTrigger>
              <SelectContent>
                {(tenants.data ?? []).filter((t) => t.status !== "archivado" && (!ownerId || t.owner_id === ownerId) && (owners.data ?? []).some((o) => o.id === t.owner_id && o.status !== "archivado")).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {tenantName(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Los arrendatarios se crean en la ficha del propietario.
            </p>
          </div>
          {!propertyId && (
            <div className="space-y-2">
              <Label>Propiedad</Label>
              <Select value={selectedProperty} onValueChange={(v) => { setSelectedProperty(v); setSelectedUnit(""); }} disabled={!form.tenant_id}>
                <SelectTrigger><SelectValue placeholder="Selecciona una propiedad" /></SelectTrigger>
                <SelectContent>{validProperties.map((p) => <SelectItem key={p.id} value={p.id}>{p.alias}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {!unitId && (
            <div className="space-y-2">
              <Label>Unidad disponible</Label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit} disabled={!selectedProperty}>
                <SelectTrigger><SelectValue placeholder="Selecciona una unidad" /></SelectTrigger>
                <SelectContent>{availableUnits.map((u) => <SelectItem key={u.id} value={u.id}>{u.alias || u.identifier}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Inicio</Label>
              <Input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Término</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Renta</Label>
              <Input
                type="number"
                required
                min={0}
                value={form.rent_amount}
                onChange={(e) => setForm({ ...form, rent_amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm({ ...form, currency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLP">CLP</SelectItem>
                  <SelectItem value="UF">UF</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Periodicidad</Label>
              <Select
                value={form.periodicity}
                onValueChange={(v) => setForm({ ...form, periodicity: v as ContractPeriodicity })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODICITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {titleCase(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Día de pago</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={form.due_day}
                onChange={(e) => setForm({ ...form, due_day: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as ContractStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {titleCase(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              Crear contrato
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
