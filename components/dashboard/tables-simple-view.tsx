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
  reservations: {
    reservation: Reservation;
  }[];
}

interface TablesSimpleViewProps {
  tables: TableWithStatus[];
}

export function TablesSimpleView({ tables }: TablesSimpleViewProps) {
  const occupiedTables = tables.filter(
    (table) => table.isActive && table.reservations.length > 0
  );
  const availableTables = tables.filter(
    (table) => table.isActive && table.reservations.length === 0
  );
  const inactiveTables = tables.filter((table) => !table.isActive);

  const totalCapacity = tables
    .filter((t) => t.isActive)
    .reduce((sum, t) => sum + t.capacity, 0);
  const occupiedCapacity = occupiedTables.reduce(
    (sum, t) => sum + t.capacity,
    0
  );

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total de Mesas</div>
          <div className="text-2xl font-bold text-gray-900">
            {tables.filter((t) => t.isActive).length}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
          <div className="text-sm text-green-700">Disponibles</div>
          <div className="text-2xl font-bold text-green-900">
            {availableTables.length}
          </div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
          <div className="text-sm text-red-700">Ocupadas</div>
          <div className="text-2xl font-bold text-red-900">
            {occupiedTables.length}
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4 border border-blue-200">
          <div className="text-sm text-blue-700">Capacidad</div>
          <div className="text-2xl font-bold text-blue-900">
            {totalCapacity - occupiedCapacity} / {totalCapacity}
          </div>
        </div>
      </div>

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
