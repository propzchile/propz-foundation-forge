import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AppShell,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from "@/components/propz/app-shell";
import { DeleteAction } from "@/components/propz/delete-action";
import { TenantForm } from "@/components/propz/tenant-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tenantName } from "@/lib/propz/domain";
import { useCreateTenant, useDeleteTenant, useOwners, useTenants } from "@/lib/propz/queries";

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

function NewTenantDialog() {
  const owners = useOwners();
  const create = useCreateTenant();
  const [open, setOpen] = useState(false);
  const [ownerId, setOwnerId] = useState("");
  const activeOwners = (owners.data ?? []).filter((o) => o.status !== "archivado");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Nuevo arrendatario</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo arrendatario</DialogTitle>
        </DialogHeader>
        {activeOwners.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Primero necesitas un propietario activo: cada arrendatario pertenece a uno.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Propietario</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un propietario" />
                </SelectTrigger>
                <SelectContent>
                  {activeOwners.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <TenantForm
              mode="create"
              pending={create.isPending}
              onSubmit={async (values) => {
                if (!ownerId) {
                  toast.error("Selecciona un propietario");
                  return;
                }
                try {
                  await create.mutateAsync({ owner_id: ownerId, ...values });
                  toast.success("Arrendatario creado");
                  setOpen(false);
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

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

  const activeOwnerIds = useMemo(
    () => new Set((owners.data ?? []).filter((o) => o.status !== "archivado").map((o) => o.id)),
    [owners.data],
  );

  const rows = (tenants.data ?? []).filter((t) => {
    if (status !== "todos") {
      if (t.status !== status) return false;
      // Un arrendatario de propietario archivado queda fuera de la operación activa.
      if (status === "activo" && !activeOwnerIds.has(t.owner_id)) return false;
    }
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
      actions={<NewTenantDialog />}
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
          hint="Crea el primero con «Nuevo arrendatario» o ajusta los filtros."
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
