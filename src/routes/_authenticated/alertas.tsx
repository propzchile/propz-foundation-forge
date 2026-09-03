import { createFileRoute } from "@tanstack/react-router";

import { AppShell, ComingSoon } from "@/components/propz/app-shell";

export const Route = createFileRoute("/_authenticated/alertas")({
  head: () => ({
    meta: [
      { title: "Alertas — Propz" },
      {
        name: "description",
        content: "Alertas automáticas de tu cartera de arriendos en Propz: disponibles próximamente.",
      },
      { property: "og:title", content: "Alertas — Propz" },
      {
        property: "og:description",
        content: "Vencimientos, reajustes y avisos de tu cartera, en una próxima fase de Propz.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell
      title="Alertas"
      description="Avisos y vencimientos relevantes de tu cartera."
      crumbs={[{ label: "Alertas" }]}
    >
      <ComingSoon
        title="Alertas"
        description="Las alertas automáticas estarán disponibles próximamente."
      />
    </AppShell>
  ),
});
