import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

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
import { titleCase } from "@/lib/propz/domain";
import { useAllUnits, useContracts, useDeleteUnit } from "@/lib/propz/queries";

export const Route = createFileRoute("/_authenticated/unidades/")({
  head: () => ({
    meta: [
      { title: "Unidades — Propz" },
      {
        name: "description",
        content: "Listado de unidades arrendables de tu cartera, con su estado de ocupación.",
      },
      { property: "og:title", content: "Unidades — Propz" },
      {
        property: "og:description",
        content: "Revisa las unidades de cada propiedad y su ocupación actual.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UnitsListPage,
});

function UnitsListPage() {
  const units = useAllUnits();
  const contracts = useContracts({});
  const del = useDeleteUnit();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("activo");

  const occupied = new Set(
    (contracts.data ?? []).filter((c) => c.status === "ACTIVO").map((c) => c.unit_id),
  );

  const rows = (units.data ?? []).filter((u) => {
    if (status !== "todos" && u.status !== status) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [u.identifier, u.alias, u.properties?.alias, u.properties?.address]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  return (
    <AppShell
      title="Unidades"
      description="Unidades arrendables de tus propiedades."
      crumbs={[{ label: "Unidades" }]}
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder="Buscar por identificador o propiedad"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activo">Activas</SelectItem>
            <SelectItem value="archivado">Archivadas</SelectItem>
            <SelectItem value="todos">Todas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {units.isLoading ? (
        <LoadingState label="Cargando unidades…" />
      ) : units.isError ? (
        <ErrorState onRetry={() => units.refetch()} retrying={units.isFetching} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Sin unidades"
          hint="Las unidades se crean desde la ficha de cada propiedad."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((u) => (
            <div key={u.id} className="surface-card p-4">
              <div className="flex items-start justify-between gap-3">
                <Link to="/unidades/$unitId" params={{ unitId: u.id }} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{u.alias || u.identifier}</span>
                    <StatusBadge status={u.status} />
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
                        occupied.has(u.id)
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {occupied.has(u.id) ? "Ocupada" : "Disponible"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {titleCase(u.unit_type)} · {u.properties?.alias ?? "—"}
                  </p>
                </Link>
                <DeleteAction
                  entityLabel="la unidad"
                  pending={del.isPending}
                  onConfirm={() => del.mutateAsync(u.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
