import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Layers, ShieldCheck, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PropzLogo } from "@/components/propz/app-shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Propz 6.0 — Administración de propiedades por jerarquía" },
      {
        name: "description",
        content:
          "Propz organiza propietarios, propiedades, unidades, contratos y arrendatarios en una estructura clara, con permisos y aislamiento de datos.",
      },
      { property: "og:title", content: "Propz 6.0 — Administración de propiedades" },
      {
        property: "og:description",
        content:
          "Una sola estructura para propietarios autogestionados y administradores profesionales.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const PILLARS = [
  {
    icon: Layers,
    title: "Jerarquía real",
    body: "Propietario → Propiedad → Unidad → Contrato → Arrendatario, sin atajos ni datos huérfanos.",
  },
  {
    icon: Users,
    title: "Dos modos de uso",
    body: "Propietario autogestionado o administrador profesional con cartera de clientes.",
  },
  {
    icon: ShieldCheck,
    title: "Aislamiento de datos",
    body: "Cada usuario ve exclusivamente la información de su cartera, por diseño.",
  },
  {
    icon: Building2,
    title: "Listo para crecer",
    body: "Base preparada para cobranza, conciliación, documentos y automatizaciones.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <PropzLogo />
        <Button asChild variant="outline">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-16 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Propz 6.0 · Fundación
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.1] md:text-6xl">
            La administración de propiedades, con estructura de verdad.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Propietarios, propiedades, unidades, contratos y arrendatarios conectados en una sola
            jerarquía coherente, con permisos y contexto en cada pantalla.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Comenzar</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Ya tengo cuenta</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 pb-20 md:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <div key={p.title} className="surface-card p-6">
              <span className="grid size-10 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                <p.icon className="size-5" />
              </span>
              <h2 className="mt-4 text-base font-semibold">{p.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t py-8">
        <p className="mx-auto max-w-6xl px-6 text-xs text-muted-foreground">
          Propz 6.0 · Fase 3 — Fundación estructural
        </p>
      </footer>
    </div>
  );
}
