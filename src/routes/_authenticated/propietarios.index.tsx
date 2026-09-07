import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import {
  AppShell,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from "@/components/propz/app-shell";
import { OwnerForm } from "@/components/propz/owner-form";
import { DeleteAction } from "@/components/propz/delete-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useCreateOwner,
  useDeleteOwner,
  useOwnerDependencies,
  useOwners,
  useSetOwnerArchived,
  useUpdateOwner,
} from "@/lib/propz/queries";
import type { Owner } from "@/lib/propz/domain";
import { useAppContext } from "@/lib/propz/session";

export const Route = createFileRoute("/_authenticated/propietarios/")({
  head: () => ({
    meta: [
      { title: "Propietarios y clientes — Propz" },
      {
        name: "description",
        content:
          "Listado de propietarios y clientes bajo administración, con sus datos de contacto y estado.",
      },
      { property: "og:title", content: "Propietarios y clientes — Propz" },
      {
        property: "og:description",
        content: "Gestiona los propietarios y clientes de tu cartera de administración.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OwnersPage,
});

type StatusFilter = "activos" | "archivados" | "todos";

function OwnersPage() {
  const ctx = useAppContext();
  const owners = useOwners();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("activos");

  // Modo propietario: la gestión de múltiples propietarios no aplica.
  if (!ctx.loading && !ctx.isAdmin) return <Navigate to="/panel" replace />;

  const term = search.trim().toLowerCase();
  const filtered = (owners.data ?? []).filter((o) => {
    const matchesStatus =
      statusFilter === "todos"
        ? true
        : statusFilter === "archivados"
          ? o.status === "archivado"
          : o.status !== "archivado";
    if (!matchesStatus) return false;
    if (!term) return true;
    return [o.display_name, o.legal_name, o.tax_id, o.email]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(term));
  });

  return (
    <AppShell
      title="Propietarios / clientes"
      description="Solo se muestran los propietarios que administras."
      crumbs={[{ label: "Mi administración", to: "/panel" }, { label: "Propietarios" }]}
      actions={<NewOwnerDialog />}
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, razón social o RUT"
          aria-label="Buscar propietarios"
          className="w-full sm:max-w-sm"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activos">Activos</SelectItem>
            <SelectItem value="archivados">Archivados</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {owners.isLoading ? (
        <LoadingState label="Cargando propietarios…" />
      ) : owners.isError ? (
        <ErrorState
          title="No pudimos cargar los propietarios"
          hint="Puede ser un problema momentáneo de conexión. Vuelve a intentarlo."
          onRetry={() => owners.refetch()}
          retrying={owners.isFetching}
        />
      ) : (owners.data?.length ?? 0) === 0 ? (
        <EmptyState title="Sin propietarios" hint="Crea el primero para comenzar." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          hint="Prueba con otro nombre o RUT, o cambia el filtro de estado."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((o) => (
            <OwnerCard key={o.id} owner={o} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function DataRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3 border-b py-1.5 last:border-b-0">
      <span className="shrink-0 text-xs uppercase text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right text-sm">{value || "—"}</span>
    </div>
  );
}

function OwnerCard({ owner }: { owner: Owner }) {
  const [editOpen, setEditOpen] = useState(false);
  const update = useUpdateOwner();
  const setArchived = useSetOwnerArchived();
  const del = useDeleteOwner();
  const deps = useOwnerDependencies(owner.id);
  const isArchived = owner.status === "archivado";

  const blockedReason =
    (deps.data?.total ?? 0) > 0
      ? "Este propietario tiene propiedades, arrendatarios o contratos asociados. Archívalo en lugar de eliminarlo."
      : null;

  return (
    <div className="surface-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Link
          to="/propietarios/$ownerId"
          params={{ ownerId: owner.id }}
          className="font-medium hover:underline"
        >
          {owner.display_name}
        </Link>
        <StatusBadge status={owner.status} />
      </div>

      <div className="mt-3">
        <DataRow
          label="Tipo"
          value={owner.party_type === "empresa" ? "Empresa" : "Persona natural"}
        />
        <DataRow label="Razón social" value={owner.legal_name} />
        <DataRow label="RUT" value={owner.tax_id} />
        <DataRow label="Email" value={owner.email} />
        <DataRow label="Teléfono" value={owner.phone} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Editar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar propietario</DialogTitle>
            </DialogHeader>
            <OwnerForm
              mode="edit"
              pending={update.isPending}
              initialValues={{
                display_name: owner.display_name,
                party_type: owner.party_type,
                legal_name: owner.legal_name,
                tax_id: owner.tax_id,
                email: owner.email,
                phone: owner.phone,
                notes: owner.notes,
              }}
              onSubmit={async (values) => {
                try {
                  await update.mutateAsync({ id: owner.id, ...values });
                  toast.success("Cambios guardados");
                  setEditOpen(false);
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }}
            />
          </DialogContent>
        </Dialog>

        <Button
          variant="secondary"
          size="sm"
          disabled={setArchived.isPending}
          onClick={async () => {
            try {
              await setArchived.mutateAsync({ id: owner.id, archived: !isArchived });
              toast.success(isArchived ? "Propietario reactivado" : "Propietario archivado");
            } catch (err) {
              toast.error((err as Error).message);
            }
          }}
        >
          {isArchived ? "Reactivar" : "Archivar"}
        </Button>

        <DeleteAction
          entityLabel={`a ${owner.display_name}`}
          blockedReason={blockedReason}
          pending={del.isPending}
          onConfirm={() => del.mutateAsync(owner.id)}
        />

        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <Link to="/propietarios/$ownerId" params={{ ownerId: owner.id }}>
            Ver ficha
          </Link>
        </Button>
      </div>
    </div>
  );
}

function NewOwnerDialog() {
  const [open, setOpen] = useState(false);
  const create = useCreateOwner();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nuevo propietario</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo propietario / cliente</DialogTitle>
        </DialogHeader>
        <OwnerForm
          mode="create"
          pending={create.isPending}
          onSubmit={async (values) => {
            try {
              await create.mutateAsync({ ...values, linkToSelf: false });
              toast.success("Propietario creado");
              setOpen(false);
            } catch (err) {
              toast.error((err as Error).message);
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
