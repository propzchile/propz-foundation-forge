import { Link, useNavigate } from "@tanstack/react-router";
import {
  LogOut,
  Building2,
  LayoutDashboard,
  Users,
  Home,
  FileText,
  KeyRound,
  Wallet,
  Receipt,
  Bell,
  Menu,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/lib/propz/session";

export type Crumb = { label: string; to?: string; params?: Record<string, string> };

export function PropzLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display ${className}`}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Building2 className="size-4" />
      </span>
      <span className="text-lg font-semibold tracking-tight">Propz</span>
    </span>
  );
}

type NavItem = { to: string; label: string; icon: typeof Users; soon?: boolean };
type NavGroup = { title?: string; items: NavItem[] };

const NAV: NavGroup[] = [
  { items: [{ to: "/panel", label: "Panel", icon: LayoutDashboard }] },
  {
    title: "Gestión",
    items: [
      { to: "/propietarios", label: "Propietarios", icon: Users },
      { to: "/propiedades", label: "Propiedades", icon: Building2 },
      { to: "/unidades", label: "Unidades", icon: Home },
      { to: "/arrendatarios", label: "Arrendatarios", icon: KeyRound },
      { to: "/contratos", label: "Contratos", icon: FileText },
    ],
  },
  {
    title: "Finanzas",
    items: [
      { to: "/pagos", label: "Pagos", icon: Wallet, soon: true },
      { to: "/cartolas", label: "Cartolas", icon: Receipt, soon: true },
    ],
  },
  { items: [{ to: "/alertas", label: "Alertas", icon: Bell, soon: true }] },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-6" aria-label="Navegación principal">
      {NAV.map((group, gi) => (
        <div key={group.title ?? `g-${gi}`}>
          {group.title && (
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              {group.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={onNavigate}
                  activeProps={{
                    className: "bg-sidebar-accent text-sidebar-accent-foreground",
                  }}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.soon && (
                    <span className="rounded bg-sidebar-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-sidebar-foreground/70">
                      Pronto
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function ContextBar({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Jerarquía" className="flex flex-wrap items-center gap-1 text-sm">
      {crumbs.map((crumb, i) => (
        <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
          {i > 0 && <span className="text-muted-foreground/60">/</span>}
          {crumb.to ? (
            <Link
              to={crumb.to}
              params={crumb.params as never}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function AppShell({
  crumbs = [],
  title,
  description,
  actions,
  children,
}: {
  crumbs?: Crumb[];
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { role, profile, email } = useAppContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileNav, setMobileNav] = useState(false);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || email || "Usuario";

  const roleLabel =
    role === "administrador" ? "Administración" : role === "propietario" ? "Cartera propia" : "Sin rol";

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-5 lg:flex">
        <Link to="/panel" className="mb-8 px-2 text-sidebar-foreground">
          <PropzLogo />
        </Link>
        <SidebarNav />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b bg-surface/95 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Abrir navegación"
                onClick={() => setMobileNav((v) => !v)}
              >
                <Menu className="size-5" />
              </Button>
              <div className="lg:hidden">
                <PropzLogo />
              </div>
              <div className="hidden lg:block">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Propz
                </p>
                <p className="text-sm font-medium">Panel Operativo</p>
              </div>
              <Badge variant="secondary" className="uppercase tracking-wide">
                {roleLabel}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right text-xs leading-tight sm:block">
                <div className="font-medium">{displayName}</div>
                <div className="text-muted-foreground">{email}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label="Cerrar sesión">
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
          {mobileNav && (
            <div className="border-t bg-sidebar px-3 py-4 lg:hidden">
              <SidebarNav onNavigate={() => setMobileNav(false)} />
            </div>
          )}
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          {crumbs.length > 0 && (
            <div className="mb-4">
              <ContextBar crumbs={crumbs} />
            </div>
          )}
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            {actions}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <p className="font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground"
    >
      {label}
    </div>
  );
}

export function ErrorState({
  title = "No pudimos cargar la información",
  hint = "Revisa tu conexión e inténtalo nuevamente.",
  onRetry,
  retrying,
}: {
  title?: string;
  hint?: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/5 p-10 text-center"
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry} disabled={retrying}>
          {retrying ? "Reintentando…" : "Reintentar"}
        </Button>
      )}
    </div>
  );
}

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed p-12 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      <span className="mt-4 inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium uppercase tracking-wide text-secondary-foreground">
        Próximamente
      </span>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "ACTIVO" || status === "activo"
      ? "bg-success/15 text-success"
      : status === "BORRADOR"
        ? "bg-warning/20 text-warning-foreground"
        : status === "CANCELADO"
          ? "bg-destructive/15 text-destructive"
          : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {status}
    </span>
  );
}
