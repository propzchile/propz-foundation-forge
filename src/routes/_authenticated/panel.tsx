import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, Users, FileText, Home } from "lucide-react";

import {
  AppShell,
  EmptyState,
  ErrorState,
  LoadingState,
  PropzLogo,
} from "@/components/propz/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppContext } from "@/lib/propz/session";
import {
  useContracts,
  useCreateOwner,
  useOwners,
  useProperties,
  useMyOwner,
  useSeedDemoData,
  useSetPrimaryRole,
  useTenants,
} from "@/lib/propz/queries";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Panel de contexto — Propz" },
      {
        name: "description",
        content:
          "Punto de entrada de Propz: identifica tu tipo de usuario y accede a tu cartera o a tu administración.",
      },
      { property: "og:title", content: "Panel de contexto — Propz" },
      {
        property: "og:description",
        content: "Accede a tu cartera propia o a los propietarios que administras en Propz.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PanelPage,
});

function PanelPage() {
  const ctx = useAppContext();

  if (ctx.loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Cargando contexto…
      </div>
    );
  }

  if (!ctx.role) return <RoleOnboarding />;
  return ctx.isAdmin ? <AdminPanel /> : <OwnerPanel />;
}

function RoleOnboarding() {
  const setRole = useSetPrimaryRole();
  const [pending, setPending] = useState<string | null>(null);

  async function choose(role: "propietario" | "administrador") {
    setPending(role);
    try {
      await setRole.mutateAsync(role);
      toast.success("Contexto configurado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-12">
      <PropzLogo />
      <h1 className="mt-8 text-2xl font-semibold">¿Cómo vas a usar Propz?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Esta elección define el modelo de datos y la jerarquía con la que trabajarás.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Propietario autogestionado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Administro directamente mis propias propiedades.</p>
            <p className="font-mono text-xs">Propietario → Propiedades → Unidades → Contratos</p>
            <Button
              className="w-full"
              disabled={pending !== null}
              onClick={() => choose("propietario")}
            >
              Usar como propietario
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Administrador profesional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Gestiono propiedades de varios propietarios o clientes.</p>
            <p className="font-mono text-xs">
              Administrador → Propietarios → Propiedades → Unidades → Contratos
            </p>
            <Button
              className="w-full"
              disabled={pending !== null}
              onClick={() => choose("administrador")}
            >
              Usar como administrador
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DemoDataButton() {
  const seed = useSeedDemoData();
  return (
    <Button
      variant="outline"
      disabled={seed.isPending}
      onClick={async () => {
        try {
          const res = await seed.mutateAsync();
          toast.success(res.message);
        } catch (e) {
          toast.error((e as Error).message);
        }
      }}
    >
      Cargar datos demo
    </Button>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <span className="grid size-10 place-items-center rounded-lg bg-secondary text-secondary-foreground">
          <Icon className="size-5" />
        </span>
        <div>
          <div className="text-xl font-semibold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminPanel() {
  const owners = useOwners();
  const properties = useProperties();
  const tenants = useTenants();
  const contracts = useContracts({});

  return (
    <AppShell
      title="Mi administración"
      description="Cartera de propietarios y clientes que administras."
      crumbs={[{ label: "Mi administración" }]}
      actions={
        <div className="flex gap-2">
          <DemoDataButton />
          <Button asChild>
            <Link to="/propietarios">Ver propietarios</Link>
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Users} label="Propietarios" value={owners.data?.length ?? 0} />
        <MetricCard icon={Building2} label="Propiedades" value={properties.data?.length ?? 0} />
        <MetricCard icon={Home} label="Arrendatarios" value={tenants.data?.length ?? 0} />
        <MetricCard icon={FileText} label="Contratos" value={contracts.data?.length ?? 0} />
      </div>

      <h2 className="mt-10 mb-3 text-lg font-semibold">Propietarios / clientes</h2>
      {(owners.data?.length ?? 0) === 0 ? (
        <EmptyState
          title="Aún no administras propietarios"
          hint="Crea tu primer cliente o carga los datos demo para explorar la jerarquía."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {owners.data!.map((o) => (
            <Link
              key={o.id}
              to="/propietarios/$ownerId"
              params={{ ownerId: o.id }}
              className="surface-card block p-4 transition-colors hover:border-accent"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{o.display_name}</span>
                <span className="text-xs text-muted-foreground">{o.tax_id ?? "—"}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {o.party_type === "empresa" ? "Empresa" : "Persona natural"} · {o.status}
                {o.is_demo ? " · demo" : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function OwnerPanel() {
  const createOwner = useCreateOwner();
  const ctx = useAppContext();
  const properties = useProperties();
  const contracts = useContracts({});
  const myOwnerQuery = useMyOwner(ctx.userId);
  const myOwner = myOwnerQuery.data ?? null;

  return (
    <AppShell
      title="Mi cartera"
      description="Tus propiedades, unidades, contratos y arrendatarios."
      crumbs={[{ label: "Mi cartera" }]}
      actions={<DemoDataButton />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={Building2} label="Propiedades" value={properties.data?.length ?? 0} />
        <MetricCard icon={FileText} label="Contratos" value={contracts.data?.length ?? 0} />
        <MetricCard
          icon={Users}
          label="Contratos activos"
          value={contracts.data?.filter((c) => c.status === "ACTIVO").length ?? 0}
        />
      </div>

      <div className="mt-10">
        {myOwnerQuery.isLoading ? (
          <LoadingState label="Cargando tu cartera…" />
        ) : myOwnerQuery.isError ? (
          <ErrorState
            title="No pudimos cargar tu cartera"
            hint="Puede ser un problema momentáneo de conexión. Vuelve a intentarlo."
            onRetry={() => myOwnerQuery.refetch()}
            retrying={myOwnerQuery.isFetching}
          />
        ) : !myOwner ? (
          <div className="surface-card p-6">
            <h2 className="text-lg font-semibold">Crea tu ficha de propietario</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Toda propiedad pertenece a un propietario. Crearemos tu ficha con los datos de tu
              perfil.
            </p>
            <Button
              className="mt-4"
              disabled={createOwner.isPending}
              onClick={async () => {
                try {
                  await createOwner.mutateAsync({
                    display_name:
                      [ctx.profile?.first_name, ctx.profile?.last_name]
                        .filter(Boolean)
                        .join(" ")
                        .trim() ||
                      ctx.email ||
                      "Propietario",
                    party_type: "natural",
                    email: ctx.email,
                    linkToSelf: true,
                  });
                  toast.success("Ficha creada");
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              Crear mi ficha
            </Button>
          </div>
        ) : (
          <Link
            to="/propietarios/$ownerId"
            params={{ ownerId: myOwner.id }}
            className="surface-card block p-6 transition-colors hover:border-accent"
          >
            <h2 className="text-lg font-semibold">{myOwner.display_name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Entrar a la cartera: propiedades, unidades, contratos y arrendatarios.
            </p>
          </Link>
        )}
      </div>
    </AppShell>
  );
}
