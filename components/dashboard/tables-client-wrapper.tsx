"use client";

import { useState, useEffect } from "react";
import { TablesTabs } from "./tables-tabs";
import { TablesSimpleView } from "./tables-simple-view";
import { TablesStatsOverview } from "./tables-stats-overview";
import FloorPlanHandler from "./floor-plan-handler";
import { getSectorsByBranch } from "@/actions/Sector";
import { Button } from "@/components/ui/button";
import { Settings2, Plus } from "lucide-react";
import { AddSectorDialog } from "./floor-plan/add-sector-dialog";
import { EditSectorDialog } from "./floor-plan/edit-sector-dialog";
import { AddTableDialog } from "./floor-plan/add-table-dialog";
import { createTable } from "@/actions/Table";
import type { TableShapeType } from "@/types/table";

export interface TableWithReservations {
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
  sectorId: string | null;
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

interface TablesClientWrapperProps {
  branchId: string;
  initialTables: TableWithReservations[];
}

interface Sector {
  id: string;
  name: string;
  color: string;
  order: number;
  width: number;
  height: number;
  _count: {
    tables: number;
  };
}

const shapeDefaults = {
  CIRCLE: { width: 80, height: 80 },
  SQUARE: { width: 100, height: 100 },
  RECTANGLE: { width: 120, height: 80 },
  WIDE: { width: 200, height: 60 },
};

export function TablesClientWrapper({
  branchId,
  initialTables,
}: TablesClientWrapperProps) {
  const [tables, setTables] = useState<TableWithReservations[]>(initialTables);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [addSectorDialogOpen, setAddSectorDialogOpen] = useState(false);
  const [editSectorDialogOpen, setEditSectorDialogOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [addTableDialogOpen, setAddTableDialogOpen] = useState(false);
  const [newTable, setNewTable] = useState({
    number: "",
    name: "",
    shape: "CIRCLE" as TableShapeType,
    capacity: "2",
    isShared: false,
    sectorId: "",
  });

  // Fetch sectors on mount
  useEffect(() => {
    const fetchSectors = async () => {
      const result = await getSectorsByBranch(branchId);
      if (result.success && result.data) {
        setSectors(result.data);
      }
    };
    fetchSectors();
  }, [branchId]);

  const refreshSectors = async () => {
    const result = await getSectorsByBranch(branchId);
    if (result.success && result.data) {
      setSectors(result.data);
    }
  };

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
      sectorId: newTable.sectorId || undefined,
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
        status: null,
        isActive: result.data.isActive ?? true,
        isShared: result.data.isShared ?? false,
        sectorId: result.data.sectorId ?? null,
        reservations: [],
      };

      setTables((prevTables) => [...prevTables, newDbTable]);
      setNewTable({
        number: "",
        name: "",
        shape: "CIRCLE",
        capacity: "2",
        isShared: false,
        sectorId: "",
      });
      setAddTableDialogOpen(false);
      refreshSectors();
    }
  };

  // Filter tables by selected sector
  const filteredTables = selectedSector
    ? tables.filter((table) => table.sectorId === selectedSector)
    : tables;

  return (
    <>
      <TablesStatsOverview tables={tables} />

      {/* Sector Tabs - Shared between both views */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <Button
          variant={selectedSector === null ? "default" : "outline"}
          onClick={() => setSelectedSector(null)}
          className={
            selectedSector === null
              ? "bg-gray-600 hover:bg-gray-700"
              : "hover:bg-gray-100"
          }
        >
          Todas las Mesas
          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-background/20">
            {tables.length}
          </span>
        </Button>
        {sectors.map((sector) => (
          <div key={sector.id} className="relative group">
            <Button
              variant={selectedSector === sector.id ? "default" : "outline"}
              onClick={() => setSelectedSector(sector.id)}
              className={
                selectedSector === sector.id
                  ? "pr-10"
                  : "hover:bg-gray-100 border-2 pr-10"
              }
              style={{
                backgroundColor:
                  selectedSector === sector.id ? sector.color : "transparent",
                borderColor: sector.color,
                color: selectedSector === sector.id ? "white" : sector.color,
              }}
            >
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: sector.color }}
              />
              {sector.name}
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-background/20">
                {sector._count.tables}
              </span>
            </Button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingSector(sector);
                setEditSectorDialogOpen(true);
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                color: selectedSector === sector.id ? "white" : sector.color,
              }}
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <Button
          variant="outline"
          onClick={() => setAddSectorDialogOpen(true)}
          className="border-dashed"
        >
          + Nuevo Sector
        </Button>
        <Button
          onClick={() => setAddTableDialogOpen(true)}
          className="bg-red-600 hover:bg-red-700 ml-auto gap-2"
        >
          <Plus className="h-4 w-4" />
          Agregar Mesa
        </Button>
      </div>

      <TablesTabs>
        <FloorPlanHandler
          branchId={branchId}
          tables={tables}
          setTables={setTables}
          selectedSector={selectedSector}
          sectors={sectors}
        />
        <TablesSimpleView tables={filteredTables} />
      </TablesTabs>

      <AddSectorDialog
        open={addSectorDialogOpen}
        onOpenChange={setAddSectorDialogOpen}
        branchId={branchId}
        onSectorAdded={refreshSectors}
      />

      <EditSectorDialog
        open={editSectorDialogOpen}
        onOpenChange={setEditSectorDialogOpen}
        sector={editingSector}
        onSectorUpdated={refreshSectors}
      />

      <AddTableDialog
        open={addTableDialogOpen}
        onOpenChange={setAddTableDialogOpen}
        tableNumber={newTable.number}
        tableName={newTable.name}
        tableShape={newTable.shape}
        tableCapacity={newTable.capacity}
        isShared={newTable.isShared}
        sectorId={newTable.sectorId}
        sectors={sectors}
        onTableNumberChange={(value) =>
          setNewTable({ ...newTable, number: value })
        }
        onTableNameChange={(value) => setNewTable({ ...newTable, name: value })}
        onTableShapeChange={(value) =>
          setNewTable({ ...newTable, shape: value })
        }
        onTableCapacityChange={(value) =>
          setNewTable({ ...newTable, capacity: value })
        }
        onIsSharedChange={(value) =>
          setNewTable({ ...newTable, isShared: value })
        }
        onSectorChange={(value) =>
          setNewTable({ ...newTable, sectorId: value })
        }
        onAddTable={addTable}
      />
    </>
  );
}
