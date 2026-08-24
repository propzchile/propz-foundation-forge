import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, EmptyState, StatusBadge } from "@/components/propz/app-shell";
import { OwnerForm } from "@/components/propz/owner-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateOwner, useOwners } from "@/lib/propz/queries";
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
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
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
              await create.mutateAsync({ ...values, linkToSelf: !ctx.isAdmin });
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
