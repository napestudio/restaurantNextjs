import { Card, CardContent } from "@/components/ui/card";

interface FloorPlanStatsProps {
  total: number;
  empty: number;
  occupied: number;
  reserved: number;
}

export function FloorPlanStats({
  total,
  empty,
  occupied,
  reserved,
}: FloorPlanStatsProps) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{total}</div>
          <p className="text-xs text-muted-foreground">Total de Mesas</p>
        </CardContent>
      </Card>
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-green-700">{empty}</div>
          <p className="text-xs text-green-600">Disponibles</p>
        </CardContent>
      </Card>
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-red-700">{occupied}</div>
          <p className="text-xs text-red-600">Ocupadas</p>
        </CardContent>
      </Card>
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-blue-700">{reserved}</div>
          <p className="text-xs text-blue-600">Reservadas</p>
        </CardContent>
      </Card>
    </div>
  );
}
