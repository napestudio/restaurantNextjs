"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import {
  getTables,
  createTable,
  updateTableFloorPlan,
  updateFloorPlanBatch,
  deleteTable as deleteTableAction,
} from "@/actions/Table";
import { FloorPlanToolbar } from "./floor-plan/floor-plan-toolbar";
import { FloorPlanStats } from "./floor-plan/floor-plan-stats";
import { FloorPlanCanvas } from "./floor-plan/floor-plan-canvas";
import { TablePropertiesPanel } from "./floor-plan/table-properties-panel";
import { AddTableDialog } from "./floor-plan/add-table-dialog";
import { FloorPlanInstructions } from "./floor-plan/floor-plan-instructions";

type TableShapeType = "CIRCLE" | "SQUARE" | "RECTANGLE";
type TableStatus = "empty" | "occupied" | "reserved" | "cleaning";

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
}

const shapeDefaults = {
  CIRCLE: { width: 80, height: 80 },
  SQUARE: { width: 100, height: 100 },
  RECTANGLE: { width: 120, height: 80 },
};

interface FloorPlanPageProps {
  branchId: string;
}

export default function FloorPlanPage({ branchId }: FloorPlanPageProps) {
  const [tables, setTables] = useState<FloorTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [draggedTable, setDraggedTable] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const [newTable, setNewTable] = useState({
    number: "",
    shape: "CIRCLE" as TableShapeType,
    capacity: "2",
  });

  // Load tables from database on mount
  useEffect(() => {
    loadTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const loadTables = async () => {
    setLoading(true);
    const result = await getTables(branchId);
    if (result.success && result.data) {
      // Transform database tables to FloorTable format
      const floorTables: FloorTable[] = result.data.map((table) => ({
        id: table.id,
        number: table.number,
        x: table.positionX ?? 100,
        y: table.positionY ?? 100,
        width: table.width ?? 80,
        height: table.height ?? 80,
        rotation: table.rotation ?? 0,
        shape: (table.shape ?? "SQUARE") as TableShapeType,
        capacity: table.capacity,
        status: "empty" as TableStatus, // TODO: calculate from reservations
        currentGuests: 0,
      }));
      setTables(floorTables);
    }
    setLoading(false);
  };

  // Handle mouse down on table
  const handleTableMouseDown = (e: React.MouseEvent, tableId: string) => {
    e.stopPropagation();
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    setDraggedTable(tableId);
    setSelectedTable(tableId);
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
                x: Math.max(0, Math.min(800 - table.width, x - dragOffset.x)),
                y: Math.max(0, Math.min(600 - table.height, y - dragOffset.y)),
              }
            : table
        )
      );
    };

    const handleMouseUp = async () => {
      if (draggedTable) {
        // Save position to database when drag ends
        const table = tables.find((t) => t.id === draggedTable);
        if (table) {
          await updateTableFloorPlan(table.id, {
            positionX: table.x,
            positionY: table.y,
          });
        }
      }
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
      capacity: Number.parseInt(newTable.capacity),
      positionX: 50,
      positionY: 50,
      width: defaults.width,
      height: defaults.height,
      rotation: 0,
      shape: newTable.shape,
      isActive: true,
    });

    if (result.success) {
      await loadTables(); // Reload tables from database
      setNewTable({ number: "", shape: "CIRCLE", capacity: "2" });
      setAddDialogOpen(false);
    }
  };

  const deleteTable = async (tableId: string) => {
    const result = await deleteTableAction(tableId);

    if (result.success) {
      setTables(tables.filter((t) => t.id !== tableId));
      setSelectedTable(null);
    }
  };

  const rotateTable = async (tableId: string) => {
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

    await updateTableFloorPlan(tableId, {
      rotation: newRotation,
    });
  };

  const updateTableStatus = (tableId: string, status: TableStatus) => {
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
  };

  const updateTableCapacity = (tableId: string, capacity: number) => {
    setTables((prevTables) =>
      prevTables.map((table) =>
        table.id === tableId ? { ...table, capacity } : table
      )
    );
  };

  const updateTableShape = async (tableId: string, shape: TableShapeType) => {
    const defaults = shapeDefaults[shape];
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

    await updateTableFloorPlan(tableId, {
      shape,
      width: defaults.width,
      height: defaults.height,
    });
  };

  const saveFloorPlan = async () => {
    // Save all table positions to database
    const tablesToUpdate = tables.map((table) => ({
      id: table.id,
      positionX: table.x,
      positionY: table.y,
      width: table.width,
      height: table.height,
      rotation: table.rotation,
      shape: table.shape,
    }));

    await updateFloorPlanBatch(tablesToUpdate);
  };

  const loadFloorPlan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        setTables(data);
        // Save imported data to database
        await saveFloorPlan();
      } catch (error) {
        // Handle error silently or with toast
      }
    };
    reader.readAsText(file);
  };

  const selectedTableData = tables.find((t) => t.id === selectedTable);

  const stats = {
    total: tables.length,
    empty: tables.filter((t) => t.status === "empty").length,
    occupied: tables.filter((t) => t.status === "occupied").length,
    reserved: tables.filter((t) => t.status === "reserved").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <FloorPlanToolbar
          onAddTable={() => setAddDialogOpen(true)}
          onExport={saveFloorPlan}
          onImportClick={() => document.getElementById("file-upload")?.click()}
          onImportFile={loadFloorPlan}
        />

        <FloorPlanStats
          total={stats.total}
          empty={stats.empty}
          occupied={stats.occupied}
          reserved={stats.reserved}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Floor Plan Canvas */}
          <div className="lg:col-span-3">
            <FloorPlanCanvas
              tables={tables}
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
              onUpdateShape={updateTableShape}
              onUpdateCapacity={updateTableCapacity}
              onUpdateStatus={updateTableStatus}
              onRotate={rotateTable}
              onDelete={deleteTable}
            />
          </div>
        </div>

        <FloorPlanInstructions />
      </main>

      <AddTableDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        tableNumber={newTable.number}
        tableShape={newTable.shape}
        tableCapacity={newTable.capacity}
        onTableNumberChange={(value) =>
          setNewTable({ ...newTable, number: value })
        }
        onTableShapeChange={(value) =>
          setNewTable({ ...newTable, shape: value })
        }
        onTableCapacityChange={(value) =>
          setNewTable({ ...newTable, capacity: value })
        }
        onAddTable={addTable}
      />
    </div>
  );
}
