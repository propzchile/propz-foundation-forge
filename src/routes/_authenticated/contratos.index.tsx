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
import { CONTRACT_STATUSES, formatDate, formatMoney, tenantName } from "@/lib/propz/domain";
import { useContracts, useDeleteContract } from "@/lib/propz/queries";

export const Route = createFileRoute("/_authenticated/contratos/")({
  head: () => ({
    meta: [
      { title: "Contratos — Propz" },
      {
        name: "description",
        content: "Listado de contratos de arriendo de tu cartera, con estado y vigencia.",
      },
      { property: "og:title", content: "Contratos — Propz" },
      {
        property: "og:description",
        content: "Consulta los contratos activos, en borrador y finalizados de tu cartera.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContractsListPage,
});

function ContractsListPage() {
  const contracts = useContracts({});
  const del = useDeleteContract();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");

  const rows = (contracts.data ?? []).filter((c) => {
    if (status !== "todos" && c.status !== status) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [
      c.tenants ? tenantName(c.tenants) : null,
      c.units?.identifier,
      c.units?.alias,
      c.properties?.alias,
    ]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  return (
    <AppShell
      title="Contratos"
      description="Contratos de arriendo vinculados a unidades de tu cartera."
      crumbs={[{ label: "Contratos" }]}
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder="Buscar por arrendatario, unidad o propiedad"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {CONTRACT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {contracts.isLoading ? (
        <LoadingState label="Cargando contratos…" />
      ) : contracts.isError ? (
        <ErrorState onRetry={() => contracts.refetch()} retrying={contracts.isFetching} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Sin contratos"
          hint="Los contratos se crean desde la ficha de cada unidad."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <div key={c.id} className="surface-card flex items-start justify-between gap-3 p-4">
              <Link
                to="/contratos/$contractId"
                params={{ contractId: c.id }}
                className="min-w-0 flex-1"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {c.tenants ? tenantName(c.tenants) : "Sin arrendatario"}
                  </span>
                  <StatusBadge status={c.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.properties?.alias ?? "—"} · Unidad{" "}
                  {c.units?.alias || c.units?.identifier || "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatMoney(c.rent_amount, c.currency)} · {formatDate(c.start_date)} →{" "}
                  {formatDate(c.end_date)}
                </p>
              </Link>
              <DeleteAction
                entityLabel="el contrato"
                blockedReason={
                  c.status === "ACTIVO"
                    ? "Este contrato está activo. Finalízalo o cancélalo antes de eliminarlo."
                    : null
                }
                pending={del.isPending}
                onConfirm={() => del.mutateAsync({ id: c.id, status: c.status })}
              />
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
