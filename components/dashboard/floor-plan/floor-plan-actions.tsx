import { Button } from "@/components/ui/button";
import { Edit3, Save } from "lucide-react";

interface FloorPlanActionsProps {
  onSave: () => void;
  onToggleEditMode: () => void;
  hasUnsavedChanges: boolean;
  isSaving?: boolean;
  isEditMode: boolean;
}

export function FloorPlanActions({
  onSave,
  onToggleEditMode,
  hasUnsavedChanges,
  isSaving = false,
  isEditMode,
}: FloorPlanActionsProps) {
  return (
    <div className="flex items-center flex-col justify-end relative">
      <div className="flex items-center gap-2">
        {/* Unsaved changes indicator */}
        {hasUnsavedChanges && (
          <span className="text-amber-600 font-medium">
            • Cambios sin guardar
          </span>
        )}

        {/* Save Button - Only in edit mode */}
        {isEditMode && (
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
        )}
        {/* Edit/View Mode Toggle */}

        <Button
          onClick={onToggleEditMode}
          className={
            isEditMode
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-neutral-50 hover:bg-neutral-50/80"
          }
        >
          {isEditMode ? (
            <>Cancelar</>
          ) : (
            <>
              <Edit3 className="h-4 w-4 text-neutral-800" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
