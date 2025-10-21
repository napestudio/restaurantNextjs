"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import {
  createTable,
  updateTable,
  updateTableFloorPlan,
  updateFloorPlanBatch,
  deleteTable as deleteTableAction,
} from "@/actions/Table";
import { FloorPlanToolbar } from "./floor-plan/floor-plan-toolbar";
import { FloorPlanCanvas } from "./floor-plan/floor-plan-canvas";
import { TablePropertiesPanel } from "./floor-plan/table-properties-panel";
import { AddTableDialog } from "./floor-plan/add-table-dialog";
import { FloorPlanInstructions } from "./floor-plan/floor-plan-instructions";
import type { TableShapeType, TableStatus } from "@/types/table";

// Canvas dimensions - must match floor-plan-canvas.tsx
const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 800;

interface FloorTable {
  id: string;
  number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: TableShapeType;
  capacity: number;
  status: TableStatus;
  currentGuests: number;
  isShared: boolean;
}

const shapeDefaults = {
  CIRCLE: { width: 80, height: 80 },
  SQUARE: { width: 100, height: 100 },
  RECTANGLE: { width: 120, height: 80 },
  WIDE: { width: 200, height: 60 },
};

interface TableWithReservations {
  id: string;
  number: number;
  capacity: number;
  positionX: number | null;
  positionY: number | null;
  width: number | null;
  height: number | null;
  rotation: number | null;
  shape: string | null;
  status: string | null;
  isActive: boolean;
  isShared: boolean;
  sectionId: string | null;
  reservations: Array<{
    reservation: {
      customerName: string;
      people: number;
      status: string;
      date: string;
      timeSlot: {
        startTime: string;
        endTime: string;
      } | null;
    };
  }>;
}

interface Section {
  id: string;
  name: string;
  color: string;
  order: number;
  _count: {
    tables: number;
  };
}

interface FloorPlanPageProps {
  branchId: string;
  tables: TableWithReservations[];
  setTables: React.Dispatch<React.SetStateAction<TableWithReservations[]>>;
  selectedSection?: string | null;
  sections?: Section[];
}

export default function FloorPlanHandler({
  branchId,
  tables: dbTables,
  setTables: setDbTables,
  selectedSection: externalSelectedSection,
  sections: externalSections = [],
}: FloorPlanPageProps) {
  // Transform database tables to FloorTable format
  const transformTables = (dbTables: TableWithReservations[]): FloorTable[] => {
    return dbTables.map((table) => {
      // Map Prisma status enum to frontend status
      const statusMap: Record<string, TableStatus> = {
        EMPTY: "empty",
        OCCUPIED: "occupied",
        RESERVED: "reserved",
        CLEANING: "cleaning",
      };

      // Prioritize manual status from DB, otherwise calculate from reservations
      let status: TableStatus = "empty";
      let currentGuests = 0;

      if (table.status) {
        // Use manual status from database
        status = statusMap[table.status] || "empty";
      } else if (table.reservations.length > 0) {
        // Calculate status from reservations
        const reservation = table.reservations[0].reservation;
        currentGuests = reservation.people;

        const reservationDate = new Date(reservation.date);
        const today = new Date();
        const isToday =
          reservationDate.getDate() === today.getDate() &&
          reservationDate.getMonth() === today.getMonth() &&
          reservationDate.getFullYear() === today.getFullYear();

        if (isToday) {
          status = reservation.status === "CONFIRMED" ? "occupied" : "reserved";
        } else {
          status = "reserved";
        }
      }

      // Set currentGuests from reservations if available
      if (table.reservations.length > 0) {
        currentGuests = table.reservations[0].reservation.people;
      }

      return {
        id: table.id,
        number: table.number,
        x: table.positionX ?? 100,
        y: table.positionY ?? 100,
        width: table.width ?? 80,
        height: table.height ?? 80,
        rotation: table.rotation ?? 0,
        shape: (table.shape ?? "SQUARE") as TableShapeType,
        capacity: table.capacity,
        status,
        currentGuests,
        isShared: table.isShared,
      };
    });
  };

  const [tables, setTables] = useState<FloorTable[]>(transformTables(dbTables));
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [draggedTable, setDraggedTable] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Use external sections and selectedSection if provided
  const sections = externalSections;
  const selectedSection = externalSelectedSection;

  const [newTable, setNewTable] = useState({
    number: "",
    name: "",
    shape: "CIRCLE" as TableShapeType,
    capacity: "2",
    isShared: false,
    sectionId: "",
  });

  // Filter tables by selected section
  const filteredTables = selectedSection
    ? tables.filter((table) => {
        const dbTable = dbTables.find((t) => t.id === table.id);
        return dbTable?.sectionId === selectedSection;
      })
    : tables;

  // Sync floor plan tables when dbTables change (e.g., new reservations)
  useEffect(() => {
    setTables((prevTables) => {
      return dbTables.map((dbTable) => {
        // Find existing floor table to preserve position/UI state
        const existingFloorTable = prevTables.find((t) => t.id === dbTable.id);

        // Map Prisma status enum to frontend status
        const statusMap: Record<string, TableStatus> = {
          EMPTY: "empty",
          OCCUPIED: "occupied",
          RESERVED: "reserved",
          CLEANING: "cleaning",
        };

        // Prioritize manual status from DB, otherwise calculate from reservations
        let status: TableStatus = "empty";
        let currentGuests = 0;

        if (dbTable.status) {
          // Use manual status from database
          status = statusMap[dbTable.status] || "empty";
        } else if (dbTable.reservations.length > 0) {
          // Calculate status from reservations
          const reservation = dbTable.reservations[0].reservation;
          currentGuests = reservation.people;

          const reservationDate = new Date(reservation.date);
          const today = new Date();
          const isToday =
            reservationDate.getDate() === today.getDate() &&
            reservationDate.getMonth() === today.getMonth() &&
            reservationDate.getFullYear() === today.getFullYear();

          if (isToday) {
            status =
              reservation.status === "CONFIRMED" ? "occupied" : "reserved";
          } else {
            status = "reserved";
          }
        }

        // Set currentGuests from reservations if available
        if (dbTable.reservations.length > 0) {
          currentGuests = dbTable.reservations[0].reservation.people;
        }

        // If table exists, preserve floor plan properties but update status
        if (existingFloorTable) {
          return {
            ...existingFloorTable,
            number: dbTable.number,
            capacity: dbTable.capacity,
            status,
            currentGuests,
            isShared: dbTable.isShared,
          };
        }

        // New table - use transform logic
        return {
          id: dbTable.id,
          number: dbTable.number,
          x: dbTable.positionX ?? 100,
          y: dbTable.positionY ?? 100,
          width: dbTable.width ?? 80,
          height: dbTable.height ?? 80,
          rotation: dbTable.rotation ?? 0,
          shape: (dbTable.shape ?? "SQUARE") as TableShapeType,
          capacity: dbTable.capacity,
          status,
          currentGuests,
          isShared: dbTable.isShared,
        };
      });
    });
  }, [dbTables]);

  // Handle mouse down on table
  const handleTableMouseDown = (e: React.MouseEvent, tableId: string) => {
    e.stopPropagation();

    // Always allow selecting tables, but only allow dragging in edit mode
    setSelectedTable(tableId);

    if (!isEditMode) return;

    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    setDraggedTable(tableId);
    setDragOffset({
      x: x - table.x,
      y: y - table.y,
    });
  };

  // Handle mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggedTable) return;

      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      setTables((prevTables) =>
        prevTables.map((table) =>
          table.id === draggedTable
            ? {
                ...table,
                x: Math.max(
                  0,
                  Math.min(CANVAS_WIDTH - table.width, x - dragOffset.x)
                ),
                y: Math.max(
                  0,
                  Math.min(CANVAS_HEIGHT - table.height, y - dragOffset.y)
                ),
              }
            : table
        )
      );
    };

    const handleMouseUp = async () => {
      if (!draggedTable) return;

      // Mark as having unsaved changes instead of saving immediately
      setHasUnsavedChanges(true);
      setDraggedTable(null);
    };

    if (draggedTable) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggedTable, dragOffset, zoom, tables]);

  const addTable = async () => {
    if (!newTable.number) {
      return;
    }

    const defaults = shapeDefaults[newTable.shape];

    const result = await createTable({
      branchId,
      number: Number.parseInt(newTable.number),
      name: newTable.name || undefined,
      capacity: Number.parseInt(newTable.capacity),
      sectionId: newTable.sectionId || undefined,
      positionX: 50,
      positionY: 50,
      width: defaults.width,
      height: defaults.height,
      rotation: 0,
      shape: newTable.shape,
      isActive: true,
      isShared: newTable.isShared,
    });

    if (result.success && result.data) {
      // Add the new table to local floor plan state
      const newFloorTable: FloorTable = {
        id: result.data.id,
        number: result.data.number,
        x: result.data.positionX ?? 50,
        y: result.data.positionY ?? 50,
        width: result.data.width ?? defaults.width,
        height: result.data.height ?? defaults.height,
        rotation: result.data.rotation ?? 0,
        shape: (result.data.shape ?? newTable.shape) as TableShapeType,
        capacity: result.data.capacity,
        status: "empty" as TableStatus,
        currentGuests: 0,
        isShared: result.data.isShared ?? false,
      };

      setTables((prevTables) => [...prevTables, newFloorTable]);

      // Also update parent state for simple view
      const newDbTable: TableWithReservations = {
        id: result.data.id,
        number: result.data.number,
        capacity: result.data.capacity,
        positionX: result.data.positionX ?? 50,
        positionY: result.data.positionY ?? 50,
        width: result.data.width ?? defaults.width,
        height: result.data.height ?? defaults.height,
        rotation: result.data.rotation ?? 0,
        shape: result.data.shape ?? newTable.shape,
        status: null, // New tables have no manual status override
        isActive: result.data.isActive ?? true,
        isShared: result.data.isShared ?? false,
        sectionId: result.data.sectionId ?? null,
        reservations: [],
      };

      setDbTables((prevTables) => [...prevTables, newDbTable]);
      setNewTable({
        number: "",
        name: "",
        shape: "CIRCLE",
        capacity: "2",
        isShared: false,
        sectionId: "",
      });
      setAddDialogOpen(false);

    }
  };

  const deleteTable = async (tableId: string) => {
    const result = await deleteTableAction(tableId);

    if (result.success) {
      setTables(tables.filter((t) => t.id !== tableId));
      setDbTables((prevTables) => prevTables.filter((t) => t.id !== tableId));
      setSelectedTable(null);
    }
  };

  const rotateTable = (tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    const newRotation = (table.rotation + 45) % 360;

    setTables((prevTables) =>
      prevTables.map((t) =>
        t.id === tableId
          ? {
              ...t,
              rotation: newRotation,
            }
          : t
      )
    );

    setHasUnsavedChanges(true);
  };

  const updateTableStatus = async (tableId: string, status: TableStatus) => {
    // Map frontend status to Prisma enum
    const statusMap: Record<
      TableStatus,
      "EMPTY" | "OCCUPIED" | "RESERVED" | "CLEANING"
    > = {
      empty: "EMPTY",
      occupied: "OCCUPIED",
      reserved: "RESERVED",
      cleaning: "CLEANING",
    };

    // Update local floor plan state
    setTables((prevTables) =>
      prevTables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              status,
              currentGuests:
                status === "empty" || status === "cleaning"
                  ? 0
                  : table.currentGuests,
            }
          : table
      )
    );

    // Update database
    await updateTableFloorPlan(tableId, {
      status: statusMap[status],
    });

    // Update parent state for simple view
    setDbTables((prevTables) =>
      prevTables.map((table) =>
        table.id === tableId ? { ...table, status: statusMap[status] } : table
      )
    );
  };

  const updateTableCapacity = async (tableId: string, capacity: number) => {
    // Update local floor plan state
    setTables((prevTables) =>
      prevTables.map((table) =>
        table.id === tableId ? { ...table, capacity } : table
      )
    );

    // Update database
    await updateTable(tableId, { capacity });

    // Update parent state for simple view
    setDbTables((prevTables) =>
      prevTables.map((table) =>
        table.id === tableId ? { ...table, capacity } : table
      )
    );
  };

  const updateTableShape = (tableId: string, shape: TableShapeType) => {
    const defaults = shapeDefaults[shape];

    // Update local floor plan state
    setTables((prevTables) =>
      prevTables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              shape,
              width: defaults.width,
              height: defaults.height,
            }
          : table
      )
    );

    setHasUnsavedChanges(true);
  };

  const updateTableIsShared = async (tableId: string, isShared: boolean) => {
    // Update local floor plan state
    setTables((prevTables) =>
      prevTables.map((table) =>
        table.id === tableId ? { ...table, isShared } : table
      )
    );

    // Update database
    await updateTable(tableId, { isShared });

    // Update parent state for simple view
    setDbTables((prevTables) =>
      prevTables.map((table) =>
        table.id === tableId ? { ...table, isShared } : table
      )
    );
  };

  const saveFloorPlanChanges = async () => {
    setIsSaving(true);
    try {
      // Prepare batch update data
      const updates = tables.map((table) => ({
        id: table.id,
        positionX: table.x,
        positionY: table.y,
        width: table.width,
        height: table.height,
        rotation: table.rotation,
        shape: table.shape,
      }));

      // Batch update all tables
      await updateFloorPlanBatch(updates);

      // Update parent state for simple view
      setDbTables((prevTables) =>
        prevTables.map((table) => {
          const updatedTable = tables.find((t) => t.id === table.id);
          if (updatedTable) {
            return {
              ...table,
              positionX: updatedTable.x,
              positionY: updatedTable.y,
              width: updatedTable.width,
              height: updatedTable.height,
              rotation: updatedTable.rotation,
              shape: updatedTable.shape,
            };
          }
          return table;
        })
      );

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error saving floor plan changes:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedTableData = tables.find((t) => t.id === selectedTable);

  // Get additional table info for properties panel
  const selectedDbTable = selectedTable
    ? dbTables.find((t) => t.id === selectedTable)
    : undefined;
  const selectedTableSection = selectedDbTable?.sectionId
    ? sections.find((s) => s.id === selectedDbTable.sectionId)
    : undefined;

  return (
    <div className="space-y-6">
      <FloorPlanToolbar
        onAddTable={() => setAddDialogOpen(true)}
        onSave={saveFloorPlanChanges}
        onToggleEditMode={() => setIsEditMode(!isEditMode)}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        isEditMode={isEditMode}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Floor Plan Canvas */}

        <div className="lg:col-span-3 relative">
          <FloorPlanCanvas
            tables={filteredTables}
            selectedTable={selectedTable}
            draggedTable={draggedTable}
            zoom={zoom}
            showGrid={showGrid}
            svgRef={svgRef}
            onTableMouseDown={handleTableMouseDown}
            onZoomIn={() => setZoom(Math.min(2, zoom + 0.1))}
            onZoomOut={() => setZoom(Math.max(0.5, zoom - 0.1))}
            onToggleGrid={() => setShowGrid(!showGrid)}
          />
        </div>
        {/* Properties Panel */}
        <div className="lg:col-span-1">
          <TablePropertiesPanel
            selectedTable={selectedTableData}
            tableName={selectedDbTable?.name}
            sectionName={selectedTableSection?.name}
            sectionColor={selectedTableSection?.color}
            onUpdateShape={updateTableShape}
            onUpdateCapacity={updateTableCapacity}
            onUpdateStatus={updateTableStatus}
            onUpdateIsShared={updateTableIsShared}
            onRotate={rotateTable}
            onDelete={deleteTable}
            isEditMode={isEditMode}
          />
        </div>
      </div>

      <FloorPlanInstructions />

      <AddTableDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        tableNumber={newTable.number}
        tableName={newTable.name}
        tableShape={newTable.shape}
        tableCapacity={newTable.capacity}
        isShared={newTable.isShared}
        sectionId={newTable.sectionId}
        sections={sections}
        onTableNumberChange={(value) =>
          setNewTable({ ...newTable, number: value })
        }
        onTableNameChange={(value) =>
          setNewTable({ ...newTable, name: value })
        }
        onTableShapeChange={(value) =>
          setNewTable({ ...newTable, shape: value })
        }
        onTableCapacityChange={(value) =>
          setNewTable({ ...newTable, capacity: value })
        }
        onIsSharedChange={(value) =>
          setNewTable({ ...newTable, isShared: value })
        }
        onSectionChange={(value) =>
          setNewTable({ ...newTable, sectionId: value })
        }
        onAddTable={addTable}
      />
    </div>
  );
}
