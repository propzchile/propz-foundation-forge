import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  Users,
  FileText,
  Home,
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
import { NewContractDialog } from "@/routes/_authenticated/unidades.$unitId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppContext } from "@/lib/propz/session";
import {
  CHARGE_CONCEPTS,
  ThresholdsDialog,
  currentCharges,
  useReferenceCharges,
  type ReferenceCharge,
} from "@/lib/propz/obligations";
import { formatMoney } from "@/lib/propz/domain";
import type { ContractWithRelations } from "@/lib/propz/queries";
import {
  contractUnitIds,
  useAllUnits,
  useContracts,
  useOwners,
  useProperties,
  useSeedDemoData,
  useSetPrimaryRole,
  useTenants,
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

function OperationalPanel() {
  const ctx = useAppContext();
  const properties = useProperties();
  const units = useAllUnits();
  const owners = useOwners();
  const tenants = useTenants();
  const contracts = useContracts({});

  const isLoading =
    properties.isLoading || units.isLoading || owners.isLoading || tenants.isLoading || contracts.isLoading;
  const isError = properties.isError || units.isError || owners.isError || tenants.isError || contracts.isError;

  const activeUnits = (units.data ?? []).filter((u) => u.status !== "archivado");
  const activeContracts = (contracts.data ?? []).filter((c) => c.status === "ACTIVO");
  const occupiedUnitIds = new Set(activeContracts.flatMap((c) => contractUnitIds(c)));

  const totalUnits = activeUnits.length;
  const occupied = activeUnits.filter((u) => occupiedUnitIds.has(u.id)).length;
  const available = totalUnits - occupied;
  const occupancyPct = totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : null;

  const activeProperties = (properties.data ?? []).filter((p) => p.status !== "archivado");
  const activeOwnerIds = new Set((owners.data ?? []).filter((o) => o.status !== "archivado").map((o) => o.id));
  const activeTenants = (tenants.data ?? []).filter((t) => t.status !== "archivado" && activeOwnerIds.has(t.owner_id));
  const ownerNameById = new Map((owners.data ?? []).map((o) => [o.id, o.display_name]));
  const refCharges = useReferenceCharges();
  const chargeMap = currentCharges(refCharges.data ?? []);
  // Sin registro de pagos aún: ninguna obligación figura como atrasada.
  const incidentPropertyIds = new Set<string>();

  // Contadores de entidades únicas (un contrato con varias unidades cuenta 1).
  const activePropertyIds = new Set(activeProperties.map((p) => p.id));
  const portfolioContracts = activeContracts.filter((c) => activePropertyIds.has(c.property_id));
  const uniqueContractCount = new Set(portfolioContracts.map((c) => c.id)).size;
  const uniqueTenantCount = new Set(portfolioContracts.map((c) => c.tenant_id)).size;
  const uniqueUnitCount = new Set(activeUnits.filter((u) => activePropertyIds.has(u.property_id)).map((u) => u.id)).size;
  void activeTenants;

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
            tenants.refetch();
            contracts.refetch();
          }}
          retrying={properties.isFetching || units.isFetching}
        />
      ) : (
        <div className="space-y-10">
          <AttentionSection
            userId={ctx.userId}
            contracts={portfolioContracts}
            propertyName={(id) => activeProperties.find((p) => p.id === id)?.alias ?? "—"}
            unitName={(id) => {
              const u = (units.data ?? []).find((x) => x.id === id);
              return u?.alias || u?.identifier || "—";
            }}
            charges={chargeMap}
          />
          <section aria-label="Resumen de cartera">
            <h2 className="mb-3 text-lg font-semibold">Resumen de cartera</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {([
                ["Propiedades", activePropertyIds.size, "/propiedades", Building2],
                ["Unidades", uniqueUnitCount, "/unidades", Home],
                ["Arrendatarios", uniqueTenantCount, "/arrendatarios", Users],
                ["Contratos", uniqueContractCount, "/contratos", FileText],
              ] as const).map(([label, value, to, Icon]) => (
                <Link key={label} to={to} className="surface-card flex items-center gap-3 p-4 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-accent">
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground"><Icon className="size-5" /></span>
                  <span className="min-w-0"><span className="block text-2xl font-semibold tabular-nums">{value}</span><span className="text-sm text-muted-foreground">{label}</span></span>
                </Link>
              ))}
            </div>
          </section>

          <section aria-label="Estado de ocupación">
            <Link to="/unidades" className="surface-card block p-5 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-accent">
              <h2 className="text-base font-semibold">Estado de ocupación</h2>
              <div className="mt-4">
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
              </div>
            </Link>
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
              <NewContractDialog />
            </div>

          </section>

          {ctx.isAdmin && (
            <section aria-label="Propietarios">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Propietarios</h2>
                <Button asChild variant="ghost" size="sm"><Link to="/propietarios">Ver todos</Link></Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {(owners.data ?? []).filter((o) => o.status !== "archivado").map((o) => {
                  const props = activeProperties.filter((p) => p.owner_id === o.id);
                  const oUnits = activeUnits.filter((u) => props.some((p) => p.id === u.property_id));
                  const oOcc = oUnits.filter((u) => occupiedUnitIds.has(u.id)).length;
                  return (
                    <Link key={o.id} to="/propietarios/$ownerId" params={{ ownerId: o.id }} className="surface-card block p-4 transition-colors hover:border-accent">
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-medium">{o.display_name}</span>
                        {props.some((p) => incidentPropertyIds.has(p.id)) ? (
                          <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">Urgente</span>
                        ) : (
                          <span className="rounded-md bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">Al día</span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {props.length} propiedades · {oUnits.length} unidades · {oOcc} ocupadas · {oUnits.length - oOcc} disponibles
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Mis propiedades */}
          <section aria-label="Mis propiedades">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{ctx.isAdmin ? "Propiedades de la cartera" : "Mis propiedades"}</h2>
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
                        {incidentPropertyIds.has(p.id) ? (
                          <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">Requiere atención</span>
                        ) : (
                          <span className="rounded-md bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">Al día</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p.address}
                        {p.comuna ? `, ${p.comuna}` : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Propietario: {ownerNameById.get(p.owner_id) ?? "—"}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                        <span>
                          <span className="font-semibold tabular-nums">{pUnits.length}</span>{" "}
                          unidades
                        </span>
                        <span className="text-muted-foreground">{pOccupied} ocupadas</span>
                        {pUnits.length - pOccupied > 0 ? (
                          <span className="rounded-md bg-destructive/15 px-2 py-1 font-semibold text-destructive ring-1 ring-destructive/40">
                            {pUnits.length - pOccupied} disponibles
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0 disponibles</span>
                        )}
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
            <Link to="/alertas" className="surface-card block p-5 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-accent">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                    <Bell className="size-4" />
                  </span>
                  <p className="text-sm text-muted-foreground">Sin alertas pendientes</p>
                </div>
                <span className="text-sm font-medium">Ir a alertas →</span>
              </div>
            </Link>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function AttentionSection({
  userId,
  contracts,
  propertyName,
  unitName,
  charges,
}: {
  userId: string | null;
  contracts: ContractWithRelations[];
  propertyName: (id: string) => string;
  unitName: (id: string) => string;
  charges: Map<string, ReferenceCharge>;
}) {
  const [view, setView] = useState<"urgente" | "revisar" | "aldia" | null>(null);
  // Incidencias: requieren pagos registrados. Hasta entonces la lista está vacía.
  // level 2 = supera umbral (urgente), 1 = deuda bajo umbral (revisar). Orden: nivel, luego monto.
  const incidents: { contractId: string; level: 1 | 2; amount: number }[] = [];
  const sorted = [...incidents].sort((a, b) => b.level - a.level || b.amount - a.amount);
  const levelOf = new Map<string, number>();
  for (const i of sorted) levelOf.set(i.contractId, Math.max(levelOf.get(i.contractId) ?? 0, i.level));
  const urgent = contracts.filter((c) => levelOf.get(c.id) === 2);
  const review = contracts.filter((c) => levelOf.get(c.id) === 1);
  const okContracts = contracts.filter((c) => !levelOf.has(c.id));
  const shown = view === "urgente" ? urgent : view === "revisar" ? review : view === "aldia" ? okContracts : [];

  const kpis = [
    { key: "urgente" as const, label: "🔴 URGENTE", hint: "Supera el umbral", list: urgent, tone: "text-destructive", border: "border-destructive", hover: "hover:border-destructive", bg: "bg-destructive/10" },
    { key: "revisar" as const, label: "🟡 REVISAR", hint: "Pendiente bajo el umbral", list: review, tone: "text-warning", border: "border-warning", hover: "hover:border-warning", bg: "bg-warning/10" },
    { key: "aldia" as const, label: "🟢 AL DÍA", hint: "Sin incidencias", list: okContracts, tone: "text-accent", border: "border-accent", hover: "hover:border-accent", bg: "" },
  ];

  return (
    <section aria-label="Qué requiere mi atención">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">¿Qué requiere mi atención?</h2>
        <ThresholdsDialog userId={userId} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {kpis.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => setView(view === k.key ? null : k.key)}
            className={`surface-card p-5 text-left transition-colors ${k.hover} ${view === k.key ? k.border : ""} ${k.list.length && k.bg ? k.bg : ""}`}
          >
            <span className={`text-xs font-semibold tracking-wide ${k.tone}`}>{k.label}</span>
            <span className="mt-1 block text-3xl font-semibold tabular-nums">{k.list.length}</span>
            <span className="text-xs text-muted-foreground">{k.hint}</span>
          </button>
        ))}
      </div>

      <div className="surface-card mt-3 p-4">
        <h3 className="text-sm font-semibold">Incidencias</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Sin incidencias. Arriendos, gastos comunes, servicios, pagos parciales e incumplimientos atrasados aparecerán aquí, ordenados por criticidad y monto, cuando se registren los pagos.
        </p>
      </div>

      {view && (
        <div className="mt-3 space-y-2">
          {shown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay unidades en esta categoría.</p>
          ) : (
            shown.map((c) => {
              const primary = contractUnitIds(c)[0];
              return (
                <div key={c.id} className="surface-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link to="/propiedades/$propertyId" params={{ propertyId: c.property_id }} className="font-medium hover:underline">
                      {propertyName(c.property_id)}
                    </Link>
                    <Link to="/unidades/$unitId" params={{ unitId: primary ?? c.unit_id }} className="text-sm text-muted-foreground hover:underline">
                      {contractUnitIds(c).map(unitName).join(" + ")}
                    </Link>
                  </div>
                  <dl className="mt-3 grid gap-1 text-sm">
                    <div className="flex justify-between"><dt>Arriendo (día {c.due_day})</dt><dd className="tabular-nums">{formatMoney(Number(c.rent_amount), c.currency)}</dd></div>
                    {CHARGE_CONCEPTS.map(({ value, label }) => {
                      const ch = charges.get(`${primary ?? c.unit_id}:${value}`);
                      return (
                        <div key={value} className="flex justify-between text-muted-foreground">
                          <dt>{label}</dt>
                          <dd className="tabular-nums">{ch ? formatMoney(Number(ch.monthly_amount), ch.currency) : "Sin valor"}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
