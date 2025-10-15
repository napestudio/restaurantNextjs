"use client";

import { TableCard } from "./table-card";

interface Reservation {
  customerName: string;
  people: number;
  timeSlot: {
    startTime: string;
    endTime: string;
  } | null;
}

interface TableWithStatus {
  id: string;
  number: number;
  capacity: number;
  isActive: boolean;
  status: string | null;
  reservations: {
    reservation: Reservation;
  }[];
}

interface TablesSimpleViewProps {
  tables: TableWithStatus[];
}

export function TablesSimpleView({ tables }: TablesSimpleViewProps) {
  // Helper function to determine if table is occupied
  const isTableOccupied = (table: TableWithStatus): boolean => {
    // If manual status is set, use it
    if (table.status) {
      return table.status === "OCCUPIED" || table.status === "RESERVED";
    }
    // Otherwise, check reservations
    return table.reservations.length > 0;
  };

  const occupiedTables = tables.filter(
    (table) => table.isActive && isTableOccupied(table)
  );
  const availableTables = tables.filter(
    (table) => table.isActive && !isTableOccupied(table)
  );
  const inactiveTables = tables.filter((table) => !table.isActive);

  return (
    <div className="space-y-6">

      {/* Occupied Tables Section */}
      {occupiedTables.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Mesas Ocupadas ({occupiedTables.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {occupiedTables.map((table) => (
              <TableCard
                key={table.id}
                tableNumber={table.number}
                capacity={table.capacity}
                isActive={table.isActive}
                currentReservation={
                  table.reservations[0]?.reservation || null
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Available Tables Section */}
      {availableTables.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Mesas Disponibles ({availableTables.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {availableTables.map((table) => (
              <TableCard
                key={table.id}
                tableNumber={table.number}
                capacity={table.capacity}
                isActive={table.isActive}
                currentReservation={null}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive Tables Section */}
      {inactiveTables.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-500 mb-4">
            Mesas Inactivas ({inactiveTables.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {inactiveTables.map((table) => (
              <TableCard
                key={table.id}
                tableNumber={table.number}
                capacity={table.capacity}
                isActive={table.isActive}
                currentReservation={null}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {tables.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No hay mesas
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Comienza agregando mesas a tu sucursal.
          </p>
        </div>
      )}
    </div>
  );
}
