import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import {
  AppShell,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from "@/components/propz/app-shell";
import { DeleteAction } from "@/components/propz/delete-action";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tenantName } from "@/lib/propz/domain";
import { useDeleteTenant, useOwners, useTenants } from "@/lib/propz/queries";

export const Route = createFileRoute("/_authenticated/arrendatarios/")({
  head: () => ({
    meta: [
      { title: "Arrendatarios — Propz" },
      {
        name: "description",
        content: "Listado de arrendatarios asociados a los propietarios de tu cartera.",
      },
      { property: "og:title", content: "Arrendatarios — Propz" },
      {
        property: "og:description",
        content: "Consulta los arrendatarios registrados en tu cartera Propz.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TenantsListPage,
});

function TenantsListPage() {
  const tenants = useTenants();
  const owners = useOwners();
  const del = useDeleteTenant();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("activo");

  const ownerName = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of owners.data ?? []) map.set(o.id, o.display_name);
    return map;
  }, [owners.data]);

  const rows = (tenants.data ?? []).filter((t) => {
    if (status !== "todos" && t.status !== status) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [t.first_name, t.last_name, t.tax_id, t.email, ownerName.get(t.owner_id)]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  return (
    <AppShell
      title="Arrendatarios"
      description="Personas y empresas que arriendan unidades de tu cartera."
      crumbs={[{ label: "Arrendatarios" }]}
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder="Buscar por nombre, RUT o correo"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="archivado">Archivados</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tenants.isLoading ? (
        <LoadingState label="Cargando arrendatarios…" />
      ) : tenants.isError ? (
        <ErrorState onRetry={() => tenants.refetch()} retrying={tenants.isFetching} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Sin arrendatarios"
          hint="Los arrendatarios se crean desde la ficha del propietario."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((t) => (
            <div key={t.id} className="surface-card flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{tenantName(t)}</span>
                  <StatusBadge status={t.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.tax_id ?? "—"} · {t.email ?? "sin correo"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Propietario: {ownerName.get(t.owner_id) ?? "—"}
                </p>
              </div>
              <DeleteAction
                entityLabel="el arrendatario"
                pending={del.isPending}
                onConfirm={() => del.mutateAsync(t.id)}
              />
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
