import { Check, Loader2 } from "lucide-react";

interface FloorPlanActionsProps {
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  showSavedIndicator: boolean;
}

export function FloorPlanActions({
  hasUnsavedChanges,
  isSaving,
  showSavedIndicator,
}: FloorPlanActionsProps) {
  return (
    <div className="flex items-center justify-end">
      <div className="flex items-center gap-2 text-sm">
        {/* Saving indicator */}
        {isSaving && (
          <span className="flex items-center gap-1.5 text-amber-600 font-medium animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin" />
            Guardando...
          </span>
        )}

        {/* Saved indicator - fades in/out */}
        {showSavedIndicator && !isSaving && (
          <span className="flex items-center gap-1.5 text-green-600 font-medium transition-opacity duration-300">
            <Check className="h-4 w-4" />
            Guardado
          </span>
        )}

        {/* Unsaved changes indicator (only show when not saving and not just saved) */}
        {hasUnsavedChanges && !isSaving && !showSavedIndicator && (
          <span className="text-neutral-500 font-medium">
            • Cambios pendientes
          </span>
        )}
      </div>
    </div>
  );
}
