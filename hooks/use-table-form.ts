import { useState, useCallback } from "react";
import { createTable } from "@/actions/Table";
import type { TableShapeType } from "@/types/table";
import type {
  NewTableFormState,
  TableWithReservations,
  INITIAL_TABLE_FORM,
} from "@/types/tables-client";
import { SHAPE_DEFAULTS } from "@/types/tables-client";

const initialFormState: NewTableFormState = {
  number: "",
  name: "",
  shape: "SQUARE",
  capacity: "2",
  isShared: false,
  sectorId: "",
};

export function useTableForm(branchId: string) {
  const [formState, setFormState] =
    useState<NewTableFormState>(initialFormState);

  const updateField = useCallback(
    <K extends keyof NewTableFormState>(
      key: K,
      value: NewTableFormState[K]
    ) => {
      setFormState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetForm = useCallback(() => {
    setFormState(initialFormState);
  }, []);

  const submitTable = useCallback(
    async (
      onSuccess: (table: TableWithReservations) => void
    ): Promise<boolean> => {
      if (!formState.number) {
        return false;
      }

      const defaults = SHAPE_DEFAULTS[formState.shape];

      const result = await createTable({
        branchId,
        number: Number.parseInt(formState.number),
        name: formState.name || undefined,
        capacity: Number.parseInt(formState.capacity),
        sectorId: formState.sectorId || undefined,
        positionX: 50,
        positionY: 50,
        width: defaults.width,
        height: defaults.height,
        rotation: 0,
        shape: formState.shape,
        isActive: true,
        isShared: formState.isShared,
      });

      if (result.success && result.data) {
        const newDbTable: TableWithReservations = {
          id: result.data.id,
          number: result.data.number,
          capacity: result.data.capacity,
          positionX: result.data.positionX ?? 50,
          positionY: result.data.positionY ?? 50,
          width: result.data.width ?? defaults.width,
          height: result.data.height ?? defaults.height,
          rotation: result.data.rotation ?? 0,
          shape: result.data.shape ?? formState.shape,
          status: null,
          isActive: result.data.isActive ?? true,
          isShared: result.data.isShared ?? false,
          sectorId: result.data.sectorId ?? null,
          reservations: [],
        };

        onSuccess(newDbTable);
        resetForm();
        return true;
      }

      return false;
    },
    [branchId, formState, resetForm]
  );

  return {
    formState,
    updateField,
    resetForm,
    submitTable,
  };
}
