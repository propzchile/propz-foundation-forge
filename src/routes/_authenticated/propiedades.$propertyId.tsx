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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { OccupancyBadge } from "@/components/propz/occupancy-badge";
import { PropertyForm } from "@/components/propz/property-form";
import { UnitForm } from "@/components/propz/unit-form";
import { NewContractDialog } from "@/routes/_authenticated/unidades.$unitId";
import {
  contractUnitIds,
  useContracts,
  useCreateUnit,
  useOwner,
  useProperty,
  useSetPropertyArchived,
  useSetUnitArchived,
  useUnits,
  useUpdateProperty,
  useUpdateUnit,
} from "@/lib/propz/queries";
import { RENTAL_MODES, titleCase, type Property, type Unit } from "@/lib/propz/domain";

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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

function PropertyDetail() {
  const { propertyId } = Route.useParams();
  const property = useProperty(propertyId);
  const owner = useOwner(property.data?.owner_id ?? "");
  const units = useUnits(propertyId);
  const contracts = useContracts({ propertyId });
  const [showArchivedUnits, setShowArchivedUnits] = useState(false);

  const occupiedUnitIds = useMemo(
    () =>
      new Set(
        (contracts.data ?? [])
          .filter((c) => c.status === "ACTIVO")
          .flatMap((c) => contractUnitIds(c)),
      ),
    [contracts.data],
  );

  const visibleUnits = useMemo(() => {
    const all = units.data ?? [];
    return showArchivedUnits ? all : all.filter((u) => u.status !== "archivado");
  }, [units.data, showArchivedUnits]);

  const parentOptions = (units.data ?? [])
    .filter((u) => u.rental_mode === "conjunta" && u.status !== "archivado")
    .map((u) => ({ id: u.id, label: u.alias || u.identifier }));

  const parentMap = useMemo(
    () => new Map((units.data ?? []).map((u) => [u.id, u.alias || u.identifier])),
    [units.data],
  );
  const childrenMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const u of units.data ?? []) {
      if (u.parent_unit_id) {
        const list = map.get(u.parent_unit_id) ?? [];
        list.push(u.alias || u.identifier);
        map.set(u.parent_unit_id, list);
      }
    }
    return map;
  }, [units.data]);

  if (property.isLoading || property.isError || !property.data) {
    return (
      <AppShell
        title="Propiedad"
        crumbs={[
          { label: "Inicio", to: "/panel" },
          { label: "Propietarios", to: "/propietarios" },
          { label: "…" },
        ]}
      >
        {property.isLoading ? (
          <LoadingState label="Cargando propiedad…" />
        ) : property.isError ? (
          <ErrorState
            title="No pudimos cargar esta propiedad"
            onRetry={() => property.refetch()}
            retrying={property.isFetching}
          />
        ) : (
          <EmptyState
            title="No encontramos esta propiedad"
            hint="Puede que ya no exista o que no forme parte de tu cartera."
          />
        )}
      </AppShell>
    );
  }

  const p = property.data;

  return (
    <AppShell
      title={p.alias}
      description={`${titleCase(p.property_type)} · ${p.address}${p.comuna ? `, ${p.comuna}` : ""}`}
      crumbs={[
        { label: "Inicio", to: "/panel" },
        { label: "Propietarios", to: "/propietarios" },
        {
          label: owner.data?.display_name ?? "Propietario",
          to: "/propietarios/$ownerId",
          params: { ownerId: p.owner_id },
        },
        { label: p.alias },
      ]}
      actions={<PropertyActions property={p} />}
    >
      <div className="surface-card mb-8 grid gap-3 p-4 sm:grid-cols-3">
        <Field label="Estado" value={<StatusBadge status={p.status} />} />
        <Field label="Tipo" value={titleCase(p.property_type)} />
        <Field label="Dirección" value={p.address} />
        <Field label="Comuna" value={p.comuna ?? "—"} />
        <Field label="Ciudad" value={p.city ?? "—"} />
        <Field label="Región" value={p.region ?? "—"} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Unidades</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="archived-units"
              checked={showArchivedUnits}
              onCheckedChange={setShowArchivedUnits}
            />
            <Label htmlFor="archived-units" className="text-sm text-muted-foreground">
              Ver archivadas
            </Label>
          </div>
          <NewUnitDialog propertyId={propertyId} parentOptions={parentOptions} />
        </div>
      </div>

      {units.isLoading ? (
        <LoadingState label="Cargando unidades…" />
      ) : units.isError ? (
        <ErrorState
          title="No pudimos cargar las unidades"
          onRetry={() => units.refetch()}
          retrying={units.isFetching}
        />
      ) : visibleUnits.length === 0 ? (
        <EmptyState
          title={(units.data?.length ?? 0) === 0 ? "Sin unidades" : "Sin unidades activas"}
          hint={
            (units.data?.length ?? 0) === 0
              ? "Toda propiedad necesita al menos una unidad para poder arrendarse."
              : "Activa «Ver archivadas» para revisar las unidades archivadas."
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visibleUnits.map((u) => (
            <div key={u.id} className="surface-card flex h-full min-h-64 flex-col p-4">
              <div className="flex items-center justify-between gap-2">
                <Link
                  to="/unidades/$unitId"
                  params={{ unitId: u.id }}
                  className="font-medium hover:underline"
                >
                  {u.alias || u.identifier}
                </Link>
                <StatusBadge status={u.status} />
              </div>
              <div className="mt-2">
                <OccupancyBadge occupied={occupiedUnitIds.has(u.id)} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {titleCase(u.unit_type)} · {u.identifier} ·{" "}
                {RENTAL_MODES.find((m) => m.value === u.rental_mode)?.label ?? u.rental_mode}
              </p>
              {u.rental_mode === "parte_de_conjunto" && (
                <p className="mt-2 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {u.parent_unit_id
                    ? `Se arrienda junto con ${parentMap.get(u.parent_unit_id) ?? "su unidad principal"}`
                    : "Sin unidad principal asignada — edítala para vincularla a un conjunto"}
                </p>
              )}
              {u.rental_mode === "conjunta" &&
                (childrenMap.get(u.id)?.length ? (
                  <p className="mt-2 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                    Conjunto con: {childrenMap.get(u.id)!.join(", ")}
                  </p>
                ) : (
                  <p className="mt-2 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                    Conjunto sin unidades vinculadas
                  </p>
                ))}
              <div className="mt-auto flex min-h-10 flex-wrap items-center gap-2 pt-4">
                <UnitActions unit={u} parentOptions={parentOptions} />
                {!occupiedUnitIds.has(u.id) && u.status !== "archivado" && (
                  <NewContractDialog
                    ownerId={p.owner_id}
                    propertyId={propertyId}
                    unitId={u.id}
                    label="Crear contrato"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function PropertyActions({ property }: { property: Property }) {
  const [editOpen, setEditOpen] = useState(false);
  const update = useUpdateProperty();
  const setArchived = useSetPropertyArchived();
  const isArchived = property.status === "archivado";

  return (
    <div className="flex flex-wrap gap-2">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Editar</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar propiedad</DialogTitle>
          </DialogHeader>
          <PropertyForm
            mode="edit"
            pending={update.isPending}
            initialValues={{
              alias: property.alias,
              property_type: property.property_type,
              address: property.address,
              comuna: property.comuna,
              city: property.city,
              region: property.region,
              country: property.country,
            }}
            onSubmit={async (values) => {
              try {
                await update.mutateAsync({ id: property.id, ...values });
                toast.success("Cambios guardados");
                setEditOpen(false);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {isArchived ? (
        <Button
          variant="secondary"
          disabled={setArchived.isPending}
          onClick={async () => {
            try {
              await setArchived.mutateAsync({ id: property.id, archived: false });
              toast.success("Propiedad reactivada");
            } catch (err) {
              toast.error((err as Error).message);
            }
          }}
        >
          {setArchived.isPending ? "Reactivando…" : "Reactivar"}
        </Button>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={setArchived.isPending}>
              Archivar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Archivar {property.alias}?</AlertDialogTitle>
              <AlertDialogDescription>
                Dejará de aparecer entre las propiedades activas. No se borra nada y puedes
                reactivarla cuando quieras.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    await setArchived.mutateAsync({ id: property.id, archived: true });
                    toast.success("Propiedad archivada");
                  } catch (err) {
                    toast.error((err as Error).message);
                  }
                }}
              >
                Archivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function UnitActions({
  unit,
  parentOptions,
}: {
  unit: Unit;
  parentOptions: { id: string; label: string }[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const update = useUpdateUnit();
  const setArchived = useSetUnitArchived();
  const isArchived = unit.status === "archivado";

  return (
    <div className="flex flex-wrap gap-2">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            Editar
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar unidad</DialogTitle>
          </DialogHeader>
          <UnitForm
            mode="edit"
            pending={update.isPending}
            parentOptions={parentOptions.filter((o) => o.id !== unit.id)}
            initialValues={{
              identifier: unit.identifier,
              alias: unit.alias,
              unit_type: unit.unit_type,
              rental_mode: unit.rental_mode,
              parent_unit_id: unit.parent_unit_id,
            }}
            onSubmit={async (values) => {
              try {
                await update.mutateAsync({ id: unit.id, ...values });
                toast.success("Unidad actualizada");
                setEditOpen(false);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {isArchived ? (
        <Button
          variant="secondary"
          size="sm"
          disabled={setArchived.isPending}
          onClick={async () => {
            try {
              await setArchived.mutateAsync({ id: unit.id, archived: false });
              toast.success("Unidad reactivada");
            } catch (err) {
              toast.error((err as Error).message);
            }
          }}
        >
          Reactivar
        </Button>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={setArchived.isPending}>
              Archivar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Archivar {unit.alias || unit.identifier}?</AlertDialogTitle>
              <AlertDialogDescription>
                La unidad dejará de aparecer entre las activas. Puedes reactivarla cuando quieras.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    await setArchived.mutateAsync({ id: unit.id, archived: true });
                    toast.success("Unidad archivada");
                  } catch (err) {
                    toast.error((err as Error).message);
                  }
                }}
              >
                Archivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function NewUnitDialog({
  propertyId,
  parentOptions,
}: {
  propertyId: string;
  parentOptions: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const create = useCreateUnit();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Agregar unidad</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva unidad</DialogTitle>
        </DialogHeader>
        <UnitForm
          mode="create"
          pending={create.isPending}
          parentOptions={parentOptions}
          onSubmit={async (values) => {
            try {
              await create.mutateAsync({ property_id: propertyId, ...values });
              toast.success("Unidad creada");
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
