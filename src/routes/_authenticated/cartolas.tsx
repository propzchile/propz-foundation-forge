import { createFileRoute } from "@tanstack/react-router";

import { AppShell, ComingSoon } from "@/components/propz/app-shell";

export const Route = createFileRoute("/_authenticated/cartolas")({
  head: () => ({
    meta: [
      { title: "Cartolas — Propz" },
      {
        name: "description",
        content: "Cartolas y movimientos de tu cartera en Propz: disponible en una próxima fase.",
      },
      { property: "og:title", content: "Cartolas — Propz" },
      {
        property: "og:description",
        content: "Las cartolas por propietario y propiedad llegarán próximamente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell
      title="Cartolas"
      description="Movimientos y estados de cuenta por propietario."
      crumbs={[{ label: "Cartolas" }]}
    >
      <ComingSoon
        title="Cartolas"
        description="Aquí encontrarás el detalle de ingresos, gastos y liquidaciones por propietario y propiedad. Este módulo se habilitará en una fase posterior."
      />
    </AppShell>
  ),
});
