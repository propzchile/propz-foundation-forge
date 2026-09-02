import { createFileRoute } from "@tanstack/react-router";

import { AppShell, ComingSoon } from "@/components/propz/app-shell";

export const Route = createFileRoute("/_authenticated/pagos")({
  head: () => ({
    meta: [
      { title: "Pagos — Propz" },
      {
        name: "description",
        content: "Módulo de pagos de arriendo de Propz: disponible en una próxima fase.",
      },
      { property: "og:title", content: "Pagos — Propz" },
      {
        property: "og:description",
        content: "El registro y seguimiento de pagos de arriendo llegará próximamente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell
      title="Pagos"
      description="Registro y seguimiento de pagos de arriendo."
      crumbs={[{ label: "Pagos" }]}
    >
      <ComingSoon
        title="Pagos"
        description="Aquí verás los pagos de arriendo, su estado y su conciliación con los contratos vigentes. Estamos construyendo este módulo sobre la fundación actual."
      />
    </AppShell>
  ),
});
