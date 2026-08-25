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
      /** Se usa cuando el propietario autogestionado crea su propia ficha. */
      linkToSelf?: boolean;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      const { linkToSelf, ...rest } = input;
      const { data, error } = await supabase
        .from("owners")
        .insert({ ...rest, user_id: linkToSelf ? (uid ?? null) : null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owners"] });
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
    },
  });
}

export function useSetOwnerArchived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; archived: boolean }) => {
      const { data, error } = await supabase
        .from("owners")
        .update(
          input.archived
            ? { status: "archivado" as const, archived_at: new Date().toISOString() }
            : { status: "activo" as const, archived_at: null },
        )
        .eq("id", input.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No tienes permiso para cambiar el estado de este propietario.");
      return data;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["owners"] });
      qc.invalidateQueries({ queryKey: ["owner", row.id] });
    },
  });
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
