import type { FloorTableStatus } from "@/types/table";
import type { FloorTable } from "@/lib/floor-plan-utils";

interface FloorPlanStatsProps {
  tables: FloorTable[];
}

const statusConfig: Array<{
  key: FloorTableStatus;
  label: string;
  color: string;
}> = [
  { key: "empty", label: "Libres", color: "#22c55e" },
  { key: "upcoming", label: "Próxima", color: "#f59e0b" },
  { key: "reserved", label: "Llegando", color: "#8b5cf6" },
  { key: "late", label: "Demorada", color: "#f97316" },
  { key: "occupied", label: "Ocupadas", color: "#ef4444" },
  { key: "pending_payment", label: "Pago pendiente", color: "#06b6d4" },
  { key: "cleaning", label: "Limpieza", color: "#eab308" },
];

export function FloorPlanStats({ tables }: FloorPlanStatsProps) {
  const counts = tables.reduce<Partial<Record<FloorTableStatus, number>>>(
    (acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const active = statusConfig.filter(({ key }) => (counts[key] ?? 0) > 0);

  if (active.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {active.map(({ key, label, color }) => (
        <div key={key} className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs text-muted-foreground">
            {label}
            <span className="font-semibold text-foreground ml-1">
              {counts[key]}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
