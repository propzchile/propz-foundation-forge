import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type EntityStatus = Database["public"]["Enums"]["entity_status"];
export type PropertyType = Database["public"]["Enums"]["property_type"];
export type UnitType = Database["public"]["Enums"]["unit_type"];
export type UnitRentalMode = Database["public"]["Enums"]["unit_rental_mode"];
export type ContractStatus = Database["public"]["Enums"]["contract_status"];
export type ContractPeriodicity = Database["public"]["Enums"]["contract_periodicity"];
export type PartyType = Database["public"]["Enums"]["party_type"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Owner = Database["public"]["Tables"]["owners"]["Row"];
export type Property = Database["public"]["Tables"]["properties"]["Row"];
export type Unit = Database["public"]["Tables"]["units"]["Row"];
export type Tenant = Database["public"]["Tables"]["tenants"]["Row"];
export type Contract = Database["public"]["Tables"]["contracts"]["Row"];

export const PROPERTY_TYPES: PropertyType[] = [
  "departamento",
  "casa",
  "oficina",
  "local",
  "estacionamiento",
  "bodega",
  "terreno",
  "otro",
];

export const UNIT_TYPES: UnitType[] = PROPERTY_TYPES as unknown as UnitType[];

export const RENTAL_MODES: { value: UnitRentalMode; label: string }[] = [
  { value: "independiente", label: "Se arrienda independiente" },
  { value: "conjunta", label: "Se arrienda en conjunto" },
  { value: "parte_de_conjunto", label: "Forma parte de un conjunto" },
];

export const CONTRACT_STATUSES: ContractStatus[] = [
  "BORRADOR",
  "ACTIVO",
  "FINALIZADO",
  "CANCELADO",
];

export const PERIODICITIES: ContractPeriodicity[] = [
  "mensual",
  "bimestral",
  "trimestral",
  "semestral",
  "anual",
];

export const ENTITY_STATUSES: EntityStatus[] = ["activo", "inactivo", "archivado"];

export function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function tenantName(tenant: Pick<Tenant, "first_name" | "last_name">) {
  return [tenant.first_name, tenant.last_name].filter(Boolean).join(" ").trim() || "Sin nombre";
}

export function formatMoney(amount: number, currency = "CLP") {
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(new Date(value));
}

export function contractStatusTone(status: ContractStatus) {
  switch (status) {
    case "ACTIVO":
      return "success" as const;
    case "BORRADOR":
      return "warning" as const;
    case "FINALIZADO":
      return "muted" as const;
    default:
      return "destructive" as const;
  }
}

/** Un contrato es histórico cuando ya no está vigente. */
export function isHistoric(status: ContractStatus) {
  return status === "FINALIZADO" || status === "CANCELADO";
}
