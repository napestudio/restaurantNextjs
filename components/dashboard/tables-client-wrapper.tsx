"use client";

import { useState } from "react";
import { TablesTabs } from "./tables-tabs";
import { TablesSimpleView } from "./tables-simple-view";
import { TablesStatsOverview } from "./tables-stats-overview";
import FloorPlanHandler from "./floor-plan-handler";

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

export function TablesClientWrapper({
  branchId,
  initialTables,
}: TablesClientWrapperProps) {
  const [tables, setTables] = useState<TableWithReservations[]>(initialTables);

  return (
    <>
      <TablesStatsOverview tables={tables} />
      <TablesTabs>
        <FloorPlanHandler
          branchId={branchId}
          tables={tables}
          setTables={setTables}
        />
        <TablesSimpleView tables={tables} />
      </TablesTabs>
    </>
  );
}
