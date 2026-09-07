import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  Users,
  FileText,
  Home,
  KeyRound,
  DoorOpen,
  Bell,
  Plus,
} from "lucide-react";

import {
  AppShell,
  EmptyState,
  ErrorState,
  LoadingState,
  PropzLogo,
  StatusBadge,
} from "@/components/propz/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppContext } from "@/lib/propz/session";
import {
  useAllUnits,
  useContracts,
  useOwners,
  useProperties,
  useSeedDemoData,
  useSetPrimaryRole,
} from "@/lib/propz/queries";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Panel Operativo — Propz" },
      {
        name: "description",
        content:
          "Resumen operativo de tu cartera inmobiliaria en Propz: propiedades, unidades, ocupación y contratos activos.",
      },
      { property: "og:title", content: "Panel Operativo — Propz" },
      {
        property: "og:description",
        content: "Propiedades, unidades, ocupación y contratos activos de tu cartera en Propz.",
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
  return <OperationalPanel />;
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

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Building2;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 pt-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          {hint && <div className="mt-0.5 text-[11px] text-muted-foreground/80">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function OperationalPanel() {
  const ctx = useAppContext();
  const properties = useProperties();
  const units = useAllUnits();
  const owners = useOwners();
  const contracts = useContracts({});

  const isLoading =
    properties.isLoading || units.isLoading || owners.isLoading || contracts.isLoading;
  const isError = properties.isError || units.isError || owners.isError || contracts.isError;

  const activeUnits = (units.data ?? []).filter((u) => u.status !== "archivado");
  const activeContracts = (contracts.data ?? []).filter((c) => c.status === "ACTIVO");
  const occupiedUnitIds = new Set(
    activeContracts.map((c) => c.unit_id).filter((id): id is string => Boolean(id)),
  );

  const totalUnits = activeUnits.length;
  const occupied = activeUnits.filter((u) => occupiedUnitIds.has(u.id)).length;
  const available = totalUnits - occupied;
  const occupancyPct = totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : null;

  const activeProperties = (properties.data ?? []).filter((p) => p.status !== "archivado");
  const ownerNameById = new Map((owners.data ?? []).map((o) => [o.id, o.display_name]));

  const displayName =
    [ctx.profile?.first_name, ctx.profile?.last_name].filter(Boolean).join(" ") ||
    ctx.email ||
    "Usuario";
  const roleLabel = ctx.isAdmin ? "Administrador profesional" : "Propietario autogestionado";

  return (
    <AppShell
      title="Panel Operativo"
      description="Resumen de tu cartera inmobiliaria"
      crumbs={[{ label: "Panel Operativo" }]}
      actions={<DemoDataButton />}
    >
      <p className="-mt-4 mb-6 text-sm text-muted-foreground">
        {displayName} · <span className="font-medium text-foreground">{roleLabel}</span>
      </p>

      {isLoading ? (
        <LoadingState label="Cargando tu cartera…" />
      ) : isError ? (
        <ErrorState
          onRetry={() => {
            properties.refetch();
            units.refetch();
            owners.refetch();
            contracts.refetch();
          }}
          retrying={properties.isFetching || units.isFetching}
        />
      ) : (
        <div className="space-y-10">
          {/* KPIs */}
          <section aria-label="Indicadores principales">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ctx.isAdmin && (
                <KpiCard icon={Users} label="Propietarios" value={owners.data?.length ?? 0} />
              )}
              <KpiCard icon={Building2} label="Propiedades" value={activeProperties.length} />
              <KpiCard icon={Home} label="Unidades" value={totalUnits} />
              <KpiCard icon={FileText} label="Contratos activos" value={activeContracts.length} />
              <KpiCard
                icon={KeyRound}
                label="Ocupación"
                value={occupancyPct === null ? "—" : `${occupancyPct}%`}
                hint={totalUnits > 0 ? `${occupied} de ${totalUnits} unidades` : "Sin unidades"}
              />
              <KpiCard icon={DoorOpen} label="Disponibles" value={available} />
            </div>

          </section>

          {/* Ocupación + resumen */}
          <section className="grid gap-4 lg:grid-cols-3" aria-label="Estado de ocupación">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Estado de ocupación</CardTitle>
              </CardHeader>
              <CardContent>
                {totalUnits === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aún no hay unidades registradas para calcular la ocupación.
                  </p>
                ) : (
                  <>
                    <div className="flex items-end justify-between">
                      <span className="text-3xl font-semibold tabular-nums">{occupancyPct}%</span>
                      <span className="text-sm text-muted-foreground">
                        {occupied} ocupadas · {available} disponibles
                      </span>
                    </div>
                    <div
                      className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-valuenow={occupancyPct ?? 0}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Porcentaje de ocupación"
                    >
                      <div
                        className="h-full rounded-full bg-accent transition-[width]"
                        style={{ width: `${occupancyPct}%` }}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumen de cartera</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <SummaryRow label="Propiedades" value={activeProperties.length} />
                <SummaryRow label="Unidades" value={totalUnits} />
                <SummaryRow label="Ocupadas" value={occupied} />
                <SummaryRow label="Disponibles" value={available} />
                <SummaryRow label="Contratos activos" value={activeContracts.length} />
              </CardContent>
            </Card>
          </section>

          {/* Acciones rápidas */}
          <section aria-label="Acciones rápidas">
            <h2 className="mb-3 text-lg font-semibold">Acciones rápidas</h2>
            <div className="flex flex-wrap gap-2">
              {ctx.isAdmin && (
                <Button asChild variant="outline">
                  <Link to="/propietarios">
                    <Plus className="size-4" /> Nuevo propietario
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline">
                <Link to="/propiedades">
                  <Plus className="size-4" /> Nueva propiedad
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/unidades">
                  <Plus className="size-4" /> Nueva unidad
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/arrendatarios">
                  <Plus className="size-4" /> Nuevo arrendatario
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/contratos">
                  <Plus className="size-4" /> Nuevo contrato
                </Link>
              </Button>
            </div>

          </section>

          {/* Mis propiedades */}
          <section aria-label="Mis propiedades">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Mis propiedades</h2>
              {activeProperties.length > 0 && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/propiedades">Ver todas</Link>
                </Button>
              )}
            </div>
            {activeProperties.length === 0 ? (
              <div className="space-y-4">
                <EmptyState
                  title="Aún no hay propiedades"
                  hint="Crea tu primera propiedad para comenzar a gestionar unidades y contratos."
                />
                <div className="flex justify-center">
                  <Button asChild>
                    <Link to="/propiedades">
                      <Plus className="size-4" /> Nueva propiedad
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {activeProperties.map((p) => {
                  const pUnits = activeUnits.filter((u) => u.property_id === p.id);
                  const pOccupied = pUnits.filter((u) => occupiedUnitIds.has(u.id)).length;
                  return (
                    <Link
                      key={p.id}
                      to="/propiedades/$propertyId"
                      params={{ propertyId: p.id }}
                      className="surface-card block p-4 transition-colors hover:border-accent"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-medium">{p.alias}</span>
                        <StatusBadge status={p.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p.address}
                        {p.comuna ? `, ${p.comuna}` : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Propietario: {ownerNameById.get(p.owner_id) ?? "—"}
                      </p>
                      <div className="mt-3 flex gap-4 text-xs">
                        <span>
                          <span className="font-semibold tabular-nums">{pUnits.length}</span>{" "}
                          unidades
                        </span>
                        <span>
                          <span className="font-semibold tabular-nums">{pOccupied}</span> ocupadas
                        </span>
                        <span>
                          <span className="font-semibold tabular-nums">
                            {pUnits.length - pOccupied}
                          </span>{" "}
                          disponibles
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Alertas */}
          <section aria-label="Alertas">
            <h2 className="mb-3 text-lg font-semibold">Alertas</h2>
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                    <Bell className="size-4" />
                  </span>
                  <p className="text-sm text-muted-foreground">Sin alertas pendientes</p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/alertas">Ir a alertas</Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </AppShell>
  );
}
