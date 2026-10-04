import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell, EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/propz/app-shell";
import { formatDate, formatMoney, tenantName } from "@/lib/propz/domain";
import { useContracts, useOwner, useTenants } from "@/lib/propz/queries";

export const Route = createFileRoute("/_authenticated/arrendatarios/$tenantId")({
  head: () => ({ meta: [
    { title: "Ficha de arrendatario — Propz" },
    { name: "description", content: "Ficha del arrendatario y sus contratos asociados en Propz." },
    { property: "og:title", content: "Ficha de arrendatario — Propz" },
    { property: "og:description", content: "Datos del arrendatario y sus contratos de arriendo asociados." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: TenantDetail,
});

function TenantDetail() {
  const { tenantId } = Route.useParams();
  const tenants = useTenants();
  const tenant = tenants.data?.find((t) => t.id === tenantId);
  const owner = useOwner(tenant?.owner_id ?? "");
  const contracts = useContracts({ ownerId: tenant?.owner_id });
  const linked = (contracts.data ?? []).filter((c) => c.tenant_id === tenantId);

  return (
    <AppShell title={tenant ? tenantName(tenant) : "Arrendatario"} crumbs={[{ label: "Arrendatarios", to: "/arrendatarios" }, { label: tenant ? tenantName(tenant) : "…" }]}>
      {tenants.isLoading ? <LoadingState label="Cargando arrendatario…" /> : tenants.isError ? (
        <ErrorState onRetry={() => tenants.refetch()} retrying={tenants.isFetching} />
      ) : !tenant ? <EmptyState title="No encontramos este arrendatario" /> : (
        <>
          <div className="surface-card grid gap-4 p-4 sm:grid-cols-2">
            {([
              ["Estado", <StatusBadge status={tenant.status} />],
              ["Tipo", tenant.party_type === "empresa" ? "Empresa" : "Persona natural"],
              ["RUT", tenant.tax_id ?? "—"],
              ["Correo", tenant.email ?? "—"],
              ["Teléfono", tenant.phone ?? "—"],
              ["Propietario", owner.data?.display_name ?? "—"],
            ] as const).map(([label, value]) => <div key={label}><p className="text-xs uppercase text-muted-foreground">{label}</p><div className="mt-1 text-sm">{value}</div></div>)}
          </div>
          <h2 className="mb-3 mt-8 text-lg font-semibold">Contratos asociados</h2>
          {contracts.isLoading ? <LoadingState label="Cargando contratos…" /> : contracts.isError ? (
            <ErrorState onRetry={() => contracts.refetch()} retrying={contracts.isFetching} />
          ) : linked.length === 0 ? <EmptyState title="Sin contratos asociados" /> : (
            <div className="space-y-3">{linked.map((c) => (
              <Link key={c.id} to="/contratos/$contractId" params={{ contractId: c.id }} className="surface-card block p-4 transition-colors hover:border-accent">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{c.properties?.alias ?? "Propiedad"} · {c.units?.alias || c.units?.identifier || "Unidad"}</span><StatusBadge status={c.status} /></div>
                <p className="mt-1 text-sm text-muted-foreground">{formatMoney(c.rent_amount, c.currency)} · {formatDate(c.start_date)} → {formatDate(c.end_date)}</p>
              </Link>
            ))}</div>
          )}
        </>
      )}
    </AppShell>
  );
}