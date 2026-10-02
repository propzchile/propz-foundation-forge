import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppShell, StatusBadge } from "@/components/propz/app-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useContract,
  useOwner,
  useUpdateContractStatus,
  contractUnitIds,
  type ContractWithRelations,
} from "@/lib/propz/queries";
import {
  CONTRACT_STATUSES,
  formatDate,
  formatMoney,
  tenantName,
  titleCase,
  type ContractStatus,
} from "@/lib/propz/domain";

export const Route = createFileRoute("/_authenticated/contratos/$contractId")({
  head: () => ({
    meta: [
      { title: "Detalle de contrato — Propz" },
      {
        name: "description",
        content:
          "Contrato de arriendo con propietario, propiedad, unidad, arrendatario, renta y vigencia.",
      },
      { property: "og:title", content: "Detalle de contrato — Propz" },
      {
        property: "og:description",
        content: "Consulta y actualiza el estado del contrato de arriendo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContractDetail,
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-4">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

/** "D.703 (principal) + B1" a partir de contract_units. */
function unitsLabel(contract: ContractWithRelations) {
  const sorted = [...(contract.contract_units ?? [])].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary),
  );
  if (sorted.length === 0) return contract.units?.identifier ?? "—";
  return sorted
    .map((l) => (l.units?.alias || l.units?.identifier || "Unidad") + (l.is_primary ? " (principal)" : ""))
    .join(" + ");
}

function ContractDetail() {
  const { contractId } = Route.useParams();
  const contract = useContract(contractId);
  const owner = useOwner(contract.data?.owner_id ?? "");
  const updateStatus = useUpdateContractStatus();

  const c = contract.data;

  return (
    <AppShell
      title="Contrato de arriendo"
      description={c ? `${c.properties?.alias} · Unidad ${c.units?.identifier}` : "Cargando…"}
      crumbs={[
        { label: "Inicio", to: "/panel" },
        { label: "Propietarios", to: "/propietarios" },
        ...(c
          ? [
              {
                label: owner.data?.display_name ?? "Propietario",
                to: "/propietarios/$ownerId",
                params: { ownerId: c.owner_id },
              },
              {
                label: c.properties?.alias ?? "Propiedad",
                to: "/propiedades/$propertyId",
                params: { propertyId: c.property_id },
              },
              {
                label: c.units?.identifier ?? "Unidad",
                to: "/unidades/$unitId",
                params: { unitId: c.unit_id },
              },
            ]
          : []),
        { label: "Contrato" },
      ]}
      actions={
        c ? (
          <div className="flex items-center gap-2">
            <StatusBadge status={c.status} />
            <Select
              value={c.status}
              onValueChange={async (v) => {
                try {
                  await updateStatus.mutateAsync({ id: c.id, status: v as ContractStatus });
                  toast.success("Estado actualizado");
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              <SelectTrigger className="w-44">
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
        ) : null
      }
    >
      {!c ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Arrendatario" value={c.tenants ? tenantName(c.tenants) : "—"} />
          <Field label="Propiedad" value={c.properties?.alias ?? "—"} />
          <Field label="Unidades" value={unitsLabel(c)} />
          <Field label="Inicio" value={formatDate(c.start_date)} />
          <Field label="Término" value={formatDate(c.end_date)} />
          <Field label="Renta" value={formatMoney(c.rent_amount, c.currency)} />
          <Field label="Periodicidad" value={titleCase(c.periodicity)} />
          <Field label="Día de pago" value={String(c.due_day)} />
          <Field label="Estado" value={titleCase(c.status)} />
        </div>
      )}
    </AppShell>
  );
}
