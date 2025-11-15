import { Button } from "@/components/ui/button";
import { Plus, Save, Edit3, Eye } from "lucide-react";

interface FloorPlanToolbarProps {
  onAddTable: () => void;
  onSave: () => void;
  onToggleEditMode: () => void;
  hasUnsavedChanges: boolean;
  isSaving?: boolean;
  isEditMode: boolean;
}

export function FloorPlanToolbar({
  onAddTable,
  onSave,
  onToggleEditMode,
  hasUnsavedChanges,
  isSaving = false,
  isEditMode,
}: FloorPlanToolbarProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        {/* <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isEditMode ? "Editor de Plano" : "Visualización de Plano"}
        </h1> */}
        <p className="text-gray-600">
          {/* {isEditMode
            ? "Diseña y administra la distribución de tu restaurante"
            : "Vista de solo lectura del plano del restaurante"} */}
        </p>
      </div>
      <div className="flex items-end justify-end flex-col">
        <div className="flex items-center gap-2">
          <Button
            onClick={onToggleEditMode}
            variant={isEditMode ? "default" : "outline"}
            className={isEditMode ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            {isEditMode ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Modo Vista
              </>
            ) : (
              <>
                <Edit3 className="h-4 w-4 mr-2" />
                Modo Edición
              </>
            )}
          </Button>
          {isEditMode && (
            <>
              <Button
                onClick={onSave}
                disabled={!hasUnsavedChanges || isSaving}
                variant={hasUnsavedChanges ? "default" : "outline"}
                className={
                  hasUnsavedChanges ? "bg-green-600 hover:bg-green-700" : ""
                }
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Guardando..." : "Guardar Cambios"}
              </Button>
              {/* <Button
              onClick={onAddTable}
              className="bg-red-600 hover:bg-red-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Mesa
            </Button> */}
            </>
          )}
        </div>
        {hasUnsavedChanges && (
          <span className="text-amber-600 font-medium">
            • Cambios sin guardar
          </span>
        )}
      </div>
    </div>
  );
}
