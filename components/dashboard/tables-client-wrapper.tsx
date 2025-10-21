"use client";

import { useState, useEffect } from "react";
import { TablesTabs } from "./tables-tabs";
import { TablesSimpleView } from "./tables-simple-view";
import { TablesStatsOverview } from "./tables-stats-overview";
import FloorPlanHandler from "./floor-plan-handler";
import { getSectionsByBranch } from "@/actions/Section";
import { Button } from "@/components/ui/button";
import { Settings2, Plus } from "lucide-react";
import { AddSectionDialog } from "./floor-plan/add-section-dialog";
import { EditSectionDialog } from "./floor-plan/edit-section-dialog";
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

interface TablesClientWrapperProps {
  branchId: string;
  initialTables: TableWithReservations[];
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
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [addSectionDialogOpen, setAddSectionDialogOpen] = useState(false);
  const [editSectionDialogOpen, setEditSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [addTableDialogOpen, setAddTableDialogOpen] = useState(false);
  const [newTable, setNewTable] = useState({
    number: "",
    name: "",
    shape: "CIRCLE" as TableShapeType,
    capacity: "2",
    isShared: false,
    sectionId: "",
  });

  // Fetch sections on mount
  useEffect(() => {
    const fetchSections = async () => {
      const result = await getSectionsByBranch(branchId);
      if (result.success && result.data) {
        setSections(result.data);
      }
    };
    fetchSections();
  }, [branchId]);

  const refreshSections = async () => {
    const result = await getSectionsByBranch(branchId);
    if (result.success && result.data) {
      setSections(result.data);
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
        sectionId: result.data.sectionId ?? null,
        reservations: [],
      };

      setTables((prevTables) => [...prevTables, newDbTable]);
      setNewTable({
        number: "",
        name: "",
        shape: "CIRCLE",
        capacity: "2",
        isShared: false,
        sectionId: "",
      });
      setAddTableDialogOpen(false);
      refreshSections();
    }
  };

  // Filter tables by selected section
  const filteredTables = selectedSection
    ? tables.filter((table) => table.sectionId === selectedSection)
    : tables;

  return (
    <>
      <TablesStatsOverview tables={tables} />

      {/* Section Tabs - Shared between both views */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <Button
          variant={selectedSection === null ? "default" : "outline"}
          onClick={() => setSelectedSection(null)}
          className={
            selectedSection === null
              ? "bg-gray-600 hover:bg-gray-700"
              : "hover:bg-gray-100"
          }
        >
          Todas las Mesas
          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-background/20">
            {tables.length}
          </span>
        </Button>
        {sections.map((section) => (
          <div key={section.id} className="relative group">
            <Button
              variant={selectedSection === section.id ? "default" : "outline"}
              onClick={() => setSelectedSection(section.id)}
              className={
                selectedSection === section.id
                  ? "pr-10"
                  : "hover:bg-gray-100 border-2 pr-10"
              }
              style={{
                backgroundColor:
                  selectedSection === section.id ? section.color : "transparent",
                borderColor: section.color,
                color: selectedSection === section.id ? "white" : section.color,
              }}
            >
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: section.color }}
              />
              {section.name}
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-background/20">
                {section._count.tables}
              </span>
            </Button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingSection(section);
                setEditSectionDialogOpen(true);
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                color: selectedSection === section.id ? "white" : section.color,
              }}
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <Button
          variant="outline"
          onClick={() => setAddSectionDialogOpen(true)}
          className="border-dashed"
        >
          + Nueva Sección
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
          selectedSection={selectedSection}
          sections={sections}
        />
        <TablesSimpleView tables={filteredTables} />
      </TablesTabs>

      <AddSectionDialog
        open={addSectionDialogOpen}
        onOpenChange={setAddSectionDialogOpen}
        branchId={branchId}
        onSectionAdded={refreshSections}
      />

      <EditSectionDialog
        open={editSectionDialogOpen}
        onOpenChange={setEditSectionDialogOpen}
        section={editingSection}
        onSectionUpdated={refreshSections}
      />

      <AddTableDialog
        open={addTableDialogOpen}
        onOpenChange={setAddTableDialogOpen}
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
        onSectionChange={(value) =>
          setNewTable({ ...newTable, sectionId: value })
        }
        onAddTable={addTable}
      />
    </>
  );
}
