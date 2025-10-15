import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface FloorPlanToolbarProps {
  onAddTable: () => void;
}

export function FloorPlanToolbar({ onAddTable }: FloorPlanToolbarProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Editor de Plano
        </h1>
        <p className="text-gray-600">
          Diseña y administra la distribución de tu restaurante
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <Button onClick={onAddTable} className="bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Mesa
        </Button>
      </div>
    </div>
  );
}
