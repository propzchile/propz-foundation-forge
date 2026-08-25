import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Building2 } from "lucide-react";
import type { ReactNode } from "react";
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

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || email || "Usuario";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link to="/panel">
              <PropzLogo />
            </Link>
            <Badge variant="secondary" className="uppercase tracking-wide">
              {role === "administrador"
                ? "Administración"
                : role === "propietario"
                  ? "Cartera propia"
                  : "Sin rol"}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-xs leading-tight">
              <div className="font-medium">{displayName}</div>
              <div className="text-muted-foreground">{email}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label="Cerrar sesión">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {crumbs.length > 0 && (
          <div className="mb-4">
            <ContextBar crumbs={crumbs} />
          </div>
        )}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
        {children}
      </main>
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
