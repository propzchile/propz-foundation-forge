import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropzLogo } from "@/components/propz/app-shell";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acceder a Propz — Administración inteligente de propiedades" },
      {
        name: "description",
        content:
          "Inicia sesión o crea tu cuenta en Propz para administrar propiedades, unidades, contratos y arrendatarios.",
      },
      { property: "og:title", content: "Acceder a Propz" },
      {
        property: "og:description",
        content: "Accede a tu cartera de propiedades o a tu cartera de administración en Propz.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState<"auth" | "forgot" | "reset">("auth");

  useEffect(() => {
    const isRecovery =
      typeof window !== "undefined" &&
      (window.location.hash.includes("type=recovery") ||
        new URLSearchParams(window.location.search).get("type") === "recovery");

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("reset");
    });

    supabase.auth.getSession().then(({ data }) => {
      if (isRecovery) {
        setMode("reset");
        return;
      }
      if (data.session) navigate({ to: "/panel", replace: true });
    });

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?type=recovery`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Te enviamos un enlace para restablecer tu contraseña.");
    setMode("auth");
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contraseña actualizada");
    navigate({ to: "/panel", replace: true });
  }

  async function ensureProfile() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        first_name: (user.user_metadata?.["first_name"] as string) ?? firstName ?? "",
        last_name: (user.user_metadata?.["last_name"] as string) ?? lastName ?? "",
        phone: (user.user_metadata?.["phone"] as string) ?? phone ?? null,
      },
      { onConflict: "id" },
    );
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    await ensureProfile();
    setLoading(false);
    navigate({ to: "/panel", replace: true });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/panel`,
        data: { first_name: firstName, last_name: lastName, phone },
      },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await ensureProfile();
      setLoading(false);
      navigate({ to: "/panel", replace: true });
      return;
    }
    setLoading(false);
    toast.success("Revisa tu correo para confirmar la cuenta.");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <PropzLogo className="text-sidebar-foreground" />
        <div>
          <h2 className="font-display text-3xl font-semibold leading-tight">
            La administración de propiedades, ordenada por jerarquía.
          </h2>
          <p className="mt-4 max-w-md text-sm text-sidebar-foreground/80">
            Propietarios, propiedades, unidades, contratos y arrendatarios en una sola estructura,
            con aislamiento de datos por cartera.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/60">Propz 6.0 · Fundación</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <PropzLogo />
          </div>
          {mode === "reset" ? (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <h1 className="font-display text-2xl font-semibold">Nueva contraseña</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Define tu nueva contraseña para volver a entrar.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva contraseña</Label>
                <Input
                  id="newPassword"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                Actualizar contraseña
              </Button>
            </form>
          ) : mode === "forgot" ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <h1 className="font-display text-2xl font-semibold">Recuperar contraseña</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Te enviaremos un enlace para crear una nueva contraseña.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailForgot">Email</Label>
                <Input
                  id="emailForgot"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                Enviar enlace
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setMode("auth")}
              >
                Volver
              </Button>
            </form>
          ) : (
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
            </TabsList>


            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  Entrar
                </Button>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </form>

            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="first">Nombre</Label>
                    <Input
                      id="first"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last">Apellido</Label>
                    <Input
                      id="last"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email2">Email</Label>
                  <Input
                    id="email2"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password2">Contraseña</Label>
                  <Input
                    id="password2"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  Crear cuenta
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Volver al inicio
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
