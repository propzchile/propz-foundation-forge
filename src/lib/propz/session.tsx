import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Profile } from "./domain";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}

/** Contexto de aplicación: perfil + rol principal del usuario autenticado. */
export function useAppContext() {
  const { user, loading } = useSession();

  const query = useQuery({
    queryKey: ["app-context", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: existing }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
      ]);

      // Garantiza un perfil por usuario (id = auth.uid(); sin duplicados por PK).
      let profile = existing;
      if (!profile) {
        const meta = user!.user_metadata ?? {};
        const { data: created } = await supabase
          .from("profiles")
          .upsert(
            {
              id: user!.id,
              email: user!.email ?? "",
              first_name: (meta["first_name"] as string) ?? "",
              last_name: (meta["last_name"] as string) ?? "",
              phone: (meta["phone"] as string) ?? null,
            },
            { onConflict: "id" },
          )
          .select("*")
          .maybeSingle();
        profile = created ?? null;
      }

      const roleList = (roles ?? []).map((r) => r.role as AppRole);
      const role: AppRole | null =
        roleList.find((r) => r === "administrador") ?? roleList[0] ?? null;

      return {
        profile: (profile ?? null) as Profile | null,
        roles: roleList,
        role,
      };
    },
  });

  return {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    loading: loading || query.isLoading,
    profile: query.data?.profile ?? null,
    roles: query.data?.roles ?? [],
    role: query.data?.role ?? null,
    isAdmin: query.data?.role === "administrador",
    refetch: query.refetch,
  };
}
