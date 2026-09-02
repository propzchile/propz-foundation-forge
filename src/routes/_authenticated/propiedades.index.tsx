import { createFileRoute, Link } from "@tanstack/react-router";
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
import { PropertyForm } from "@/components/propz/property-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { titleCase } from "@/lib/propz/domain";
import { useCreateProperty, useDeleteProperty, useOwners, useProperties } from "@/lib/propz/queries";

export const Route = createFileRoute("/_authenticated/propiedades/")({
  head: () => ({
    meta: [
      { title: "Propiedades — Propz" },
      {
        name: "description",
        content: "Listado de todas las propiedades accesibles en tu cartera Propz.",
      },
      { property: "og:title", content: "Propiedades — Propz" },
      {
        property: "og:description",
        content: "Consulta, crea y administra las propiedades de tu cartera.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PropertiesListPage,
});

function NewPropertyDialog() {
  const owners = useOwners();
  const create = useCreateProperty();
  const [open, setOpen] = useState(false);
  const activeOwners = (owners.data ?? []).filter((o) => o.status !== "archivado");
  const [ownerId, setOwnerId] = useState<string>("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Nueva propiedad</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva propiedad</DialogTitle>
        </DialogHeader>
        {activeOwners.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Primero crea un propietario: toda propiedad debe pertenecer a uno.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <span className="text-sm font-medium">Propietario</span>
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
            <PropertyForm
              mode="create"
              pending={create.isPending}
              onSubmit={async (values) => {
                if (!ownerId) {
                  toast.error("Selecciona un propietario");
                  return;
                }
                try {
                  await create.mutateAsync({ owner_id: ownerId, ...values });
                  toast.success("Propiedad creada");
                  setOpen(false);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PropertiesListPage() {
  const properties = useProperties();
  const owners = useOwners();
  const del = useDeleteProperty();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("activo");

  const ownerName = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of owners.data ?? []) map.set(o.id, o.display_name);
    return map;
  }, [owners.data]);

  const rows = (properties.data ?? []).filter((p) => {
    if (status !== "todos" && p.status !== status) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [p.alias, p.address, p.comuna, p.city, ownerName.get(p.owner_id)]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  return (
    <AppShell
      title="Propiedades"
      description="Todas las propiedades accesibles según tu cartera."
      crumbs={[{ label: "Propiedades" }]}
      actions={<NewPropertyDialog />}
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder="Buscar por alias, dirección o propietario"
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

      {properties.isLoading ? (
        <LoadingState label="Cargando propiedades…" />
      ) : properties.isError ? (
        <ErrorState onRetry={() => properties.refetch()} retrying={properties.isFetching} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Sin propiedades"
          hint="Crea una propiedad o ajusta los filtros de búsqueda."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((p) => (
            <div key={p.id} className="surface-card p-4">
              <div className="flex items-start justify-between gap-3">
                <Link
                  to="/propiedades/$propertyId"
                  params={{ propertyId: p.id }}
                  className="min-w-0 flex-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.alias}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {titleCase(p.property_type)} · {p.address}
                    {p.comuna ? `, ${p.comuna}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Propietario: {ownerName.get(p.owner_id) ?? "—"}
                  </p>
                </Link>
                <DeleteAction
                  entityLabel="la propiedad"
                  pending={del.isPending}
                  onConfirm={() => del.mutateAsync(p.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
