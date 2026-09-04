import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Contract, Owner, Property, Tenant, Unit } from "./domain";

/* ---------------------------------- OWNERS --------------------------------- */

export function useOwners() {
  return useQuery({
    queryKey: ["owners"],
    queryFn: async (): Promise<Owner[]> => {
      const { data, error } = await supabase
        .from("owners")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useOwner(ownerId: string) {
  return useQuery({
    queryKey: ["owner", ownerId],
    queryFn: async (): Promise<Owner | null> => {
      const { data, error } = await supabase
        .from("owners")
        .select("*")
        .eq("id", ownerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Ficha de propietario del propio usuario (nunca un fallback a otra ficha). */
export function useMyOwner(userId: string | null) {
  return useQuery({
    queryKey: ["my-owner", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Owner | null> => {
      const { data, error } = await supabase
        .from("owners")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      display_name: string;
      party_type: Owner["party_type"];
      legal_name?: string | null;
      tax_id?: string | null;
      email?: string | null;
      phone?: string | null;
      notes?: string | null;
      /** Se usa cuando el propietario autogestionado crea su propia ficha. */
      linkToSelf?: boolean;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
      const { linkToSelf, ...rest } = input;

      // `owners_insert` exige created_by = auth.uid() y, o bien user_id = auth.uid(),
      // o bien user_id NULL cuando el usuario es administrador.
      const payload: Record<string, unknown> = { ...rest, created_by: uid };
      if (linkToSelf) {
        payload['user_id'] = uid;
      } else {
        const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
          _user_id: uid,
          _role: "administrador",
        });
        if (roleError) throw roleError;
        if (!isAdmin) {
          // Sin rol de administrador solo puede crear su propia ficha.
          payload['user_id'] = uid;
        }
        // Como administrador: no se envía user_id (queda NULL), tal como exige la policy.
      }

      const { data, error } = await supabase
        .from("owners")
        .insert(payload as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owners"] });
      qc.invalidateQueries({ queryKey: ["my-owner"] });
    },
  });
}

export function useUpdateOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      display_name: string;
      party_type: Owner["party_type"];
      legal_name?: string | null;
      tax_id?: string | null;
      email?: string | null;
      phone?: string | null;
      notes?: string | null;
    }) => {
      const { id, ...fields } = input;
      const { data, error } = await supabase
        .from("owners")
        .update(fields)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No tienes permiso para editar este propietario.");
      return data;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["owners"] });
      qc.invalidateQueries({ queryKey: ["owner", row.id] });
      qc.invalidateQueries({ queryKey: ["my-owner"] });
    },
  });
}

/**
 * Archiva o reactiva un propietario y arrastra su cartera (propiedades, unidades,
 * arrendatarios y contratos) fuera/dentro de la operación activa. No borra nada.
 */
export function useSetOwnerArchived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; archived: boolean }) => {
      const archivedPatch = input.archived
        ? { status: "archivado" as const, archived_at: new Date().toISOString() }
        : { status: "activo" as const, archived_at: null };

      const { data, error } = await supabase
        .from("owners")
        .update(archivedPatch)
        .eq("id", input.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No tienes permiso para cambiar el estado de este propietario.");

      // Cascada de estado (no destructiva).
      const { data: props } = await supabase
        .from("properties")
        .select("id")
        .eq("owner_id", input.id);
      const propertyIds = (props ?? []).map((p) => p.id);

      await supabase.from("properties").update(archivedPatch).eq("owner_id", input.id);
      await supabase.from("tenants").update(archivedPatch).eq("owner_id", input.id);
      if (propertyIds.length > 0) {
        await supabase.from("units").update(archivedPatch).in("property_id", propertyIds);
      }
      await supabase
        .from("contracts")
        .update({ archived_at: input.archived ? new Date().toISOString() : null })
        .eq("owner_id", input.id);

      return data;
    },
    onSuccess: (row) => {
      invalidateAllPropz(qc);
      qc.invalidateQueries({ queryKey: ["owner", row.id] });
    },
  });
}

/** Ids de propietarios que participan en la operación activa. */
export function useActiveOwnerIds() {
  const owners = useOwners();
  const ids = new Set(
    (owners.data ?? []).filter((o) => o.status !== "archivado").map((o) => o.id),
  );
  return ids;
}


/* -------------------------------- PROPERTIES ------------------------------- */

export function useProperties(ownerId?: string) {
  return useQuery({
    queryKey: ["properties", ownerId ?? "all"],
    queryFn: async (): Promise<Property[]> => {
      let q = supabase.from("properties").select("*").order("created_at", { ascending: true });
      if (ownerId) q = q.eq("owner_id", ownerId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProperty(propertyId: string) {
  return useQuery({
    queryKey: ["property", propertyId],
    queryFn: async (): Promise<Property | null> => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      owner_id: string;
      alias: string;
      property_type: Property["property_type"];
      address: string;
      comuna?: string | null;
      city?: string | null;
      region?: string | null;
      country?: string;
    }) => {
      const { data, error } = await supabase.from("properties").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["properties", row.owner_id] });
    },
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      alias: string;
      property_type: Property["property_type"];
      address: string;
      comuna?: string | null;
      city?: string | null;
      region?: string | null;
      country?: string;
    }) => {
      const { id, ...fields } = input;
      const { data, error } = await supabase
        .from("properties")
        .update(fields)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No tienes permiso para editar esta propiedad.");
      return data;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["property", row.id] });
    },
  });
}

export function useSetPropertyArchived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; archived: boolean }) => {
      const { data, error } = await supabase
        .from("properties")
        .update(
          input.archived
            ? { status: "archivado" as const, archived_at: new Date().toISOString() }
            : { status: "activo" as const, archived_at: null },
        )
        .eq("id", input.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No tienes permiso para cambiar el estado de esta propiedad.");
      return data;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["property", row.id] });
    },
  });
}


/* ----------------------------------- UNITS --------------------------------- */

export function useUnits(propertyId: string) {
  return useQuery({
    queryKey: ["units", propertyId],
    queryFn: async (): Promise<Unit[]> => {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUnit(unitId: string) {
  return useQuery({
    queryKey: ["unit", unitId],
    queryFn: async (): Promise<Unit | null> => {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .eq("id", unitId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      property_id: string;
      identifier: string;
      unit_type: Unit["unit_type"];
      alias?: string | null;
      rental_mode: Unit["rental_mode"];
      parent_unit_id?: string | null;
    }) => {
      const { data, error } = await supabase.from("units").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["units", row.property_id] });
    },
  });
}

export function useUpdateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      identifier: string;
      unit_type: Unit["unit_type"];
      alias?: string | null;
      rental_mode: Unit["rental_mode"];
      parent_unit_id?: string | null;
    }) => {
      const { id, ...fields } = input;
      const { data, error } = await supabase
        .from("units")
        .update(fields)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No tienes permiso para editar esta unidad.");
      return data;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["units", row.property_id] });
      qc.invalidateQueries({ queryKey: ["unit", row.id] });
    },
  });
}

export function useSetUnitArchived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; archived: boolean }) => {
      const { data, error } = await supabase
        .from("units")
        .update(
          input.archived
            ? { status: "archivado" as const, archived_at: new Date().toISOString() }
            : { status: "activo" as const, archived_at: null },
        )
        .eq("id", input.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No tienes permiso para cambiar el estado de esta unidad.");
      return data;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["units", row.property_id] });
      qc.invalidateQueries({ queryKey: ["unit", row.id] });
    },
  });

}

/* ---------------------------------- TENANTS -------------------------------- */

export function useTenants(ownerId?: string) {
  return useQuery({
    queryKey: ["tenants", ownerId ?? "all"],
    queryFn: async (): Promise<Tenant[]> => {
      let q = supabase.from("tenants").select("*").order("created_at", { ascending: true });
      if (ownerId) q = q.eq("owner_id", ownerId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      owner_id: string;
      first_name: string;
      last_name: string;
      party_type: Tenant["party_type"];
      tax_id?: string | null;
      email?: string | null;
      phone?: string | null;
    }) => {
      const { data, error } = await supabase.from("tenants").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      qc.invalidateQueries({ queryKey: ["tenants", row.owner_id] });
    },
  });
}

/* --------------------------------- CONTRACTS ------------------------------- */

export type ContractWithRelations = Contract & {
  tenants: Pick<Tenant, "id" | "first_name" | "last_name"> | null;
  units: Pick<Unit, "id" | "identifier" | "alias" | "unit_type"> | null;
  properties: Pick<Property, "id" | "alias"> | null;
};

const CONTRACT_SELECT =
  "*, tenants(id, first_name, last_name), units(id, identifier, alias, unit_type), properties(id, alias)";

export function useContracts(filter: { ownerId?: string; propertyId?: string; unitId?: string }) {
  const { ownerId, propertyId, unitId } = filter;
  return useQuery({
    queryKey: ["contracts", ownerId ?? null, propertyId ?? null, unitId ?? null],
    queryFn: async (): Promise<ContractWithRelations[]> => {
      let q = supabase
        .from("contracts")
        .select(CONTRACT_SELECT)
        .order("start_date", { ascending: false });
      if (ownerId) q = q.eq("owner_id", ownerId);
      if (propertyId) q = q.eq("property_id", propertyId);
      if (unitId) q = q.eq("unit_id", unitId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ContractWithRelations[];
    },
  });
}

export function useContract(contractId: string) {
  return useQuery({
    queryKey: ["contract", contractId],
    queryFn: async (): Promise<ContractWithRelations | null> => {
      const { data, error } = await supabase
        .from("contracts")
        .select(CONTRACT_SELECT)
        .eq("id", contractId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ContractWithRelations | null;
    },
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      owner_id: string;
      property_id: string;
      unit_id: string;
      tenant_id: string;
      start_date: string;
      end_date?: string | null;
      status: Contract["status"];
      rent_amount: number;
      currency: string;
      periodicity: Contract["periodicity"];
      due_day: number;
    }) => {
      const { data, error } = await supabase.from("contracts").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}

export function useUpdateContractStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: Contract["status"] }) => {
      const { error } = await supabase
        .from("contracts")
        .update({ status: input.status })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      qc.invalidateQueries({ queryKey: ["contract"] });
    },
  });
}

/* --------------------------------- ONBOARDING ------------------------------ */

export function useSetPrimaryRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (role: AppRole) => {
      const { data, error } = await supabase.rpc("set_primary_role", { _role: role });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-context"] });
    },
  });
}

export function useSeedDemoData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("seed_demo_data");
      if (error) throw error;
      return data as { created: number; message: string };
    },
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}

/* ------------------------- UNIDADES / CARTERA GLOBAL ----------------------- */

export type UnitWithProperty = Unit & {
  properties: Pick<Property, "id" | "alias" | "owner_id" | "address" | "comuna"> | null;
};

/** Todas las unidades accesibles (RLS decide el alcance), con su propiedad. */
export function useAllUnits() {
  return useQuery({
    queryKey: ["units", "all"],
    queryFn: async (): Promise<UnitWithProperty[]> => {
      const { data, error } = await supabase
        .from("units")
        .select("*, properties(id, alias, owner_id, address, comuna)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as UnitWithProperty[];
    },
  });
}

/* --------------------------- ARRENDATARIOS (EXTRA) ------------------------- */

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      first_name: string;
      last_name: string;
      party_type: Tenant["party_type"];
      tax_id?: string | null;
      email?: string | null;
      phone?: string | null;
    }) => {
      const { id, ...fields } = input;
      const { data, error } = await supabase
        .from("tenants")
        .update(fields)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No tienes permiso para editar este arrendatario.");
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenants"] }),
  });
}

export function useSetTenantArchived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; archived: boolean }) => {
      const { data, error } = await supabase
        .from("tenants")
        .update(
          input.archived
            ? { status: "archivado" as const, archived_at: new Date().toISOString() }
            : { status: "activo" as const, archived_at: null },
        )
        .eq("id", input.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No tienes permiso para cambiar el estado de este arrendatario.");
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenants"] }),
  });
}

/* -------------------------- ELIMINACIÓN CONTROLADA ------------------------- */

const RELATED_MESSAGE =
  "Este registro tiene información asociada y no puede eliminarse directamente. Puedes archivarlo.";

async function countRows(table: "properties" | "units" | "tenants" | "contracts", column: string, value: string) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);
  if (error) throw error;
  return count ?? 0;
}

/** Dependencias que impiden eliminar un propietario. */
export function useOwnerDependencies(ownerId: string) {
  return useQuery({
    queryKey: ["deps", "owner", ownerId],
    enabled: !!ownerId,
    queryFn: async () => {
      const [properties, tenants, contracts] = await Promise.all([
        countRows("properties", "owner_id", ownerId),
        countRows("tenants", "owner_id", ownerId),
        countRows("contracts", "owner_id", ownerId),
      ]);
      return { properties, tenants, contracts, total: properties + tenants + contracts };
    },
  });
}

export function usePropertyDependencies(propertyId: string) {
  return useQuery({
    queryKey: ["deps", "property", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const [units, contracts] = await Promise.all([
        countRows("units", "property_id", propertyId),
        countRows("contracts", "property_id", propertyId),
      ]);
      return { units, contracts, total: units + contracts };
    },
  });
}

function invalidateAllPropz(qc: ReturnType<typeof useQueryClient>) {
  for (const key of ["owners", "owner", "my-owner", "properties", "property", "units", "unit", "tenants", "contracts", "contract", "deps"]) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}

export function useDeleteOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const [properties, tenants, contracts] = await Promise.all([
        countRows("properties", "owner_id", id),
        countRows("tenants", "owner_id", id),
        countRows("contracts", "owner_id", id),
      ]);
      if (properties + tenants + contracts > 0) throw new Error(RELATED_MESSAGE);
      const { data, error } = await supabase.from("owners").delete().eq("id", id).select("id");
      if (error) throw new Error(RELATED_MESSAGE);
      if (!data || data.length === 0)
        throw new Error("No tienes permiso para eliminar este propietario.");
    },

    onSuccess: () => invalidateAllPropz(qc),
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const [units, contracts] = await Promise.all([
        countRows("units", "property_id", id),
        countRows("contracts", "property_id", id),
      ]);
      if (units + contracts > 0) throw new Error(RELATED_MESSAGE);
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw new Error(RELATED_MESSAGE);
    },
    onSuccess: () => invalidateAllPropz(qc),
  });
}

export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const contracts = await countRows("contracts", "unit_id", id);
      if (contracts > 0) throw new Error(RELATED_MESSAGE);
      const { error } = await supabase.from("units").delete().eq("id", id);
      if (error) throw new Error(RELATED_MESSAGE);
    },
    onSuccess: () => invalidateAllPropz(qc),
  });
}

export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const contracts = await countRows("contracts", "tenant_id", id);
      if (contracts > 0) throw new Error(RELATED_MESSAGE);
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw new Error(RELATED_MESSAGE);
    },
    onSuccess: () => invalidateAllPropz(qc),
  });
}

export function useDeleteContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: Contract["status"] }) => {
      if (input.status === "ACTIVO")
        throw new Error("No puedes eliminar un contrato activo. Finalízalo o cancélalo primero.");
      const { error } = await supabase.from("contracts").delete().eq("id", input.id);
      if (error) throw new Error("No pudimos eliminar el contrato. Puede tener información asociada.");
    },
    onSuccess: () => invalidateAllPropz(qc),
  });
}
