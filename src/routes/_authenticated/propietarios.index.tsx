import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, EmptyState } from "@/components/propz/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useCreateOwner, useOwners } from "@/lib/propz/queries";
import { useAppContext } from "@/lib/propz/session";
import type { PartyType } from "@/lib/propz/domain";

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

function OwnersPage() {
  const owners = useOwners();
  const ctx = useAppContext();

  return (
    <AppShell
      title={ctx.isAdmin ? "Propietarios / clientes" : "Propietarios de mi cartera"}
      description={
        ctx.isAdmin
          ? "Solo se muestran los propietarios que administras."
          : "Solo se muestran las fichas de propietario asociadas a tu cuenta."
      }
      crumbs={[
        { label: ctx.isAdmin ? "Mi administración" : "Mi cartera", to: "/panel" },
        { label: "Propietarios" },
      ]}
      actions={<NewOwnerDialog />}
    >
      {owners.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (owners.data?.length ?? 0) === 0 ? (
        <EmptyState title="Sin propietarios" hint="Crea el primero para comenzar." />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">RUT</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {owners.data!.map((o) => (
                <tr key={o.id} className="border-t hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link
                      to="/propietarios/$ownerId"
                      params={{ ownerId: o.id }}
                      className="font-medium hover:underline"
                    >
                      {o.display_name}
                    </Link>
                    {o.is_demo && (
                      <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase text-secondary-foreground">
                        demo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {o.party_type === "empresa" ? "Empresa" : "Persona natural"}
                  </td>
                  <td className="px-4 py-3">{o.tax_id ?? "—"}</td>
                  <td className="px-4 py-3">{o.email ?? "—"}</td>
                  <td className="px-4 py-3">{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}

function NewOwnerDialog() {
  const [open, setOpen] = useState(false);
  const create = useCreateOwner();
  const ctx = useAppContext();
  const [form, setForm] = useState({
    display_name: "",
    party_type: "natural" as PartyType,
    legal_name: "",
    tax_id: "",
    email: "",
    phone: "",
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nuevo propietario</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo propietario / cliente</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await create.mutateAsync({
                display_name: form.display_name,
                party_type: form.party_type,
                legal_name: form.legal_name || null,
                tax_id: form.tax_id || null,
                email: form.email || null,
                phone: form.phone || null,
                linkToSelf: !ctx.isAdmin,
              });
              toast.success("Propietario creado");
              setOpen(false);
            } catch (err) {
              toast.error((err as Error).message);
            }
          }}
        >
          <div className="space-y-2">
            <Label>Nombre o alias</Label>
            <Input
              required
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            />
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
          {form.party_type === "empresa" && (
            <div className="space-y-2">
              <Label>Razón social</Label>
              <Input
                value={form.legal_name}
                onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
              />
            </div>
          )}
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
