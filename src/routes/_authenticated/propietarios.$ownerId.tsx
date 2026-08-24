import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, EmptyState, StatusBadge } from "@/components/propz/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { OwnerForm } from "@/components/propz/owner-form";
import {
  useContracts,
  useCreateProperty,
  useCreateTenant,
  useOwner,
  useProperties,
  useSetOwnerArchived,
  useTenants,
  useUpdateOwner,
} from "@/lib/propz/queries";
import {
  PROPERTY_TYPES,
  formatDate,
  formatMoney,
  tenantName,
  titleCase,
  type Owner,
  type PartyType,
  type PropertyType,
} from "@/lib/propz/domain";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

function OwnerActions({ owner }: { owner: Owner }) {
  const [editOpen, setEditOpen] = useState(false);
  const update = useUpdateOwner();
  const setArchived = useSetOwnerArchived();
  const isArchived = owner.status === "archivado";

  return (
    <div className="flex flex-wrap gap-2">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Editar</Button>
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

      {isArchived ? (
        <Button
          variant="secondary"
          disabled={setArchived.isPending}
          onClick={async () => {
            try {
              await setArchived.mutateAsync({ id: owner.id, archived: false });
              toast.success("Propietario reactivado");
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
              <AlertDialogTitle>¿Archivar a {owner.display_name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Dejará de aparecer entre los propietarios activos. No se borra nada y puedes
                reactivarlo cuando quieras.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    await setArchived.mutateAsync({ id: owner.id, archived: true });
                    toast.success("Propietario archivado");
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

export const Route = createFileRoute("/_authenticated/propietarios/$ownerId")({
  head: () => ({
    meta: [
      { title: "Ficha de propietario — Propz" },
      {
        name: "description",
        content:
          "Ficha del propietario con sus propiedades, arrendatarios y contratos asociados en Propz.",
      },
      { property: "og:title", content: "Ficha de propietario — Propz" },
      {
        property: "og:description",
        content: "Propiedades, unidades, arrendatarios y contratos de un propietario.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OwnerDetail,
});

function OwnerDetail() {
  const { ownerId } = Route.useParams();
  const owner = useOwner(ownerId);
  const properties = useProperties(ownerId);
  const tenants = useTenants(ownerId);
  const contracts = useContracts({ ownerId });

  return (
    <AppShell
      title={owner.data?.display_name ?? "Propietario"}
      description={
        owner.data
          ? `${owner.data.party_type === "empresa" ? "Empresa" : "Persona natural"} · ${owner.data.tax_id ?? "sin RUT"} · ${owner.data.email ?? "sin email"}`
          : "Cargando…"
      }
      crumbs={[
        { label: "Inicio", to: "/panel" },
        { label: "Propietarios", to: "/propietarios" },
        { label: owner.data?.display_name ?? "…" },
      ]}
      actions={owner.data ? <OwnerActions owner={owner.data} /> : null}
    >
      {owner.data && (
        <div className="surface-card mb-6 grid gap-3 p-4 sm:grid-cols-2">
          <Field label="Estado" value={<StatusBadge status={owner.data.status} />} />
          <Field label="RUT" value={owner.data.tax_id ?? "—"} />
          {owner.data.party_type === "empresa" && (
            <Field label="Razón social" value={owner.data.legal_name ?? "—"} />
          )}
          <Field label="Email" value={owner.data.email ?? "—"} />
          <Field label="Teléfono" value={owner.data.phone ?? "—"} />
          {owner.data.notes && <Field label="Notas" value={owner.data.notes} />}
        </div>
      )}

      <Tabs defaultValue="propiedades">
        <TabsList>
          <TabsTrigger value="propiedades">Propiedades</TabsTrigger>
          <TabsTrigger value="arrendatarios">Arrendatarios</TabsTrigger>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
        </TabsList>

        <TabsContent value="propiedades" className="mt-6">
          <div className="mb-4 flex justify-end">
            <NewPropertyDialog ownerId={ownerId} />
          </div>
          {(properties.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="Sin propiedades"
              hint="Crea la primera propiedad de este propietario."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {properties.data!.map((p) => (
                <Link
                  key={p.id}
                  to="/propiedades/$propertyId"
                  params={{ propertyId: p.id }}
                  className="surface-card block p-4 transition-colors hover:border-accent"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.alias}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {titleCase(p.property_type)} · {p.address}
                    {p.comuna ? `, ${p.comuna}` : ""}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="arrendatarios" className="mt-6">
          <div className="mb-4 flex justify-end">
            <NewTenantDialog ownerId={ownerId} />
          </div>
          {(tenants.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="Sin arrendatarios"
              hint="Los arrendatarios pertenecen al propietario y pueden reutilizarse en varios contratos."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {tenants.data!.map((t) => (
                <div key={t.id} className="surface-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{tenantName(t)}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.tax_id ?? "—"} · {t.email ?? "sin email"} · {t.phone ?? "sin teléfono"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contratos" className="mt-6">
          {(contracts.data?.length ?? 0) === 0 ? (
            <EmptyState title="Sin contratos" hint="Los contratos se crean desde una unidad." />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Unidad</th>
                    <th className="px-4 py-3">Arrendatario</th>
                    <th className="px-4 py-3">Vigencia</th>
                    <th className="px-4 py-3">Renta</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.data!.map((c) => (
                    <tr key={c.id} className="border-t hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <Link
                          to="/contratos/$contractId"
                          params={{ contractId: c.id }}
                          className="font-medium hover:underline"
                        >
                          {c.properties?.alias} · {c.units?.identifier}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{c.tenants ? tenantName(c.tenants) : "—"}</td>
                      <td className="px-4 py-3">
                        {formatDate(c.start_date)} → {formatDate(c.end_date)}
                      </td>
                      <td className="px-4 py-3">{formatMoney(c.rent_amount, c.currency)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function NewPropertyDialog({ ownerId }: { ownerId: string }) {
  const [open, setOpen] = useState(false);
  const create = useCreateProperty();
  const [form, setForm] = useState({
    alias: "",
    property_type: "departamento" as PropertyType,
    address: "",
    comuna: "",
    city: "",
    region: "",
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nueva propiedad</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva propiedad</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await create.mutateAsync({
                owner_id: ownerId,
                alias: form.alias,
                property_type: form.property_type,
                address: form.address,
                comuna: form.comuna || null,
                city: form.city || null,
                region: form.region || null,
              });
              toast.success("Propiedad creada");
              setOpen(false);
            } catch (err) {
              toast.error((err as Error).message);
            }
          }}
        >
          <div className="space-y-2">
            <Label>Alias</Label>
            <Input
              required
              value={form.alias}
              onChange={(e) => setForm({ ...form, alias: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={form.property_type}
              onValueChange={(v) => setForm({ ...form, property_type: v as PropertyType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {titleCase(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Dirección</Label>
            <Input
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Comuna</Label>
              <Input
                value={form.comuna}
                onChange={(e) => setForm({ ...form, comuna: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Ciudad</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Región</Label>
              <Input
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewTenantDialog({ ownerId }: { ownerId: string }) {
  const [open, setOpen] = useState(false);
  const create = useCreateTenant();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    party_type: "natural" as PartyType,
    tax_id: "",
    email: "",
    phone: "",
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Nuevo arrendatario</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo arrendatario</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await create.mutateAsync({
                owner_id: ownerId,
                first_name: form.first_name,
                last_name: form.last_name,
                party_type: form.party_type,
                tax_id: form.tax_id || null,
                email: form.email || null,
                phone: form.phone || null,
              });
              toast.success("Arrendatario creado");
              setOpen(false);
            } catch (err) {
              toast.error((err as Error).message);
            }
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Apellido</Label>
              <Input
                required
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={form.party_type}
              onValueChange={(v) => setForm({ ...form, party_type: v as PartyType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="natural">Persona natural</SelectItem>
                <SelectItem value="empresa">Empresa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>RUT</Label>
              <Input
                value={form.tax_id}
                onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
