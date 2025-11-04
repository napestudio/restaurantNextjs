import { useReducer, useCallback } from "react";
import type { Sector } from "@/types/tables-client";

interface DialogState {
  addSector: boolean;
  editSector: boolean;
  addTable: boolean;
  editingSector: Sector | null;
}

type DialogAction =
  | { type: "OPEN_ADD_SECTOR" }
  | { type: "CLOSE_ADD_SECTOR" }
  | { type: "OPEN_EDIT_SECTOR"; payload: Sector }
  | { type: "CLOSE_EDIT_SECTOR" }
  | { type: "OPEN_ADD_TABLE" }
  | { type: "CLOSE_ADD_TABLE" };

const initialState: DialogState = {
  addSector: false,
  editSector: false,
  addTable: false,
  editingSector: null,
};

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case "OPEN_ADD_SECTOR":
      return { ...state, addSector: true };
    case "CLOSE_ADD_SECTOR":
      return { ...state, addSector: false };
    case "OPEN_EDIT_SECTOR":
      return { ...state, editSector: true, editingSector: action.payload };
    case "CLOSE_EDIT_SECTOR":
      return { ...state, editSector: false, editingSector: null };
    case "OPEN_ADD_TABLE":
      return { ...state, addTable: true };
    case "CLOSE_ADD_TABLE":
      return { ...state, addTable: false };
    default:
      return state;
  }
}

export function useDialogs() {
  const [state, dispatch] = useReducer(dialogReducer, initialState);

  const openAddSector = useCallback(() => {
    dispatch({ type: "OPEN_ADD_SECTOR" });
  }, []);

  const closeAddSector = useCallback(() => {
    dispatch({ type: "CLOSE_ADD_SECTOR" });
  }, []);

  const openEditSector = useCallback((sector: Sector) => {
    dispatch({ type: "OPEN_EDIT_SECTOR", payload: sector });
  }, []);

  const closeEditSector = useCallback(() => {
    dispatch({ type: "CLOSE_EDIT_SECTOR" });
  }, []);

  const openAddTable = useCallback(() => {
    dispatch({ type: "OPEN_ADD_TABLE" });
  }, []);

  const closeAddTable = useCallback(() => {
    dispatch({ type: "CLOSE_ADD_TABLE" });
  }, []);

  return {
    state,
    openAddSector,
    closeAddSector,
    openEditSector,
    closeEditSector,
    openAddTable,
    closeAddTable,
  };
}
