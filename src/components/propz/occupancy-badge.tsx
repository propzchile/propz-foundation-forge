/** Estado de ocupación derivado de contratos activos reales. */
export function OccupancyBadge({ occupied }: { occupied: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        occupied
          ? "bg-muted text-muted-foreground"
          : "bg-accent/15 text-accent ring-1 ring-accent/40"
      }`}
    >
      <span aria-hidden>{occupied ? "🟢" : "🔴"}</span>
      {occupied ? "Ocupada" : "Disponible"}
    </span>
  );
}
