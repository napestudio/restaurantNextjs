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
  sectorId: string | null;
  reservations: {
    reservation: Reservation;
  }[];
}

interface Sector {
  id: string;
  name: string;
  color: string;
  order: number;
}

interface TablesSimpleViewProps {
  tables: TableWithStatus[];
  sectors?: Sector[];
}

export function TablesSimpleView({ tables, sectors = [] }: TablesSimpleViewProps) {
  // Helper function to determine if table is occupied
  const isTableOccupied = (table: TableWithStatus): boolean => {
    // If manual status is set, use it
    if (table.status) {
      return table.status === "OCCUPIED" || table.status === "RESERVED";
    }
    // Otherwise, check reservations
    return table.reservations.length > 0;
  };

  const activeTables = tables.filter((t) => t.isActive);
  const occupiedTables = activeTables.filter(isTableOccupied);
  const availableTables = activeTables.filter((t) => !isTableOccupied(t));

  // Calculate stats
  const totalCapacity = activeTables.reduce((sum, t) => sum + t.capacity, 0);
  const occupiedCapacity = occupiedTables.reduce(
    (sum, t) => sum + t.capacity,
    0
  );

  // Group tables by sector
  const tablesWithoutSector = activeTables.filter((t) => !t.sectorId);
  const sortedSectors = [...sectors].sort((a, b) => a.order - b.order);

  // Component to render a section of tables
  const renderTableSection = (
    sectionTables: TableWithStatus[],
    title: string,
    color?: string
  ) => {
    const occupied = sectionTables.filter(isTableOccupied);
    const available = sectionTables.filter((t) => !isTableOccupied(t));

    return (
      <div className="space-y-4">
        <div
          className="flex items-center gap-3 pb-3 border-b-2"
          style={{ borderColor: color || "#e5e7eb" }}
        >
          {color && (
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: color }}
            />
          )}
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <span className="text-sm text-gray-500">
            ({sectionTables.length} mesas)
          </span>
        </div>

        {/* Occupied Tables */}
        {occupied.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-red-700 mb-3 uppercase tracking-wide">
              Ocupadas ({occupied.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {occupied.map((table) => (
                <TableCard
                  key={table.id}
                  tableNumber={table.number}
                  capacity={table.capacity}
                  isActive={table.isActive}
                  isOcupied={true}
                  currentReservation={table.reservations[0]?.reservation || null}
                />
              ))}
            </div>
          </div>
        )}

        {/* Available Tables */}
        {available.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-green-700 mb-3 uppercase tracking-wide">
              Disponibles ({available.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {available.map((table) => (
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
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total de Mesas</div>
          <div className="text-2xl font-bold text-gray-900">
            {activeTables.length}
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

      {/* Tables grouped by sector */}
      {sortedSectors.map((sector) => {
        const sectorTables = activeTables.filter((t) => t.sectorId === sector.id);
        if (sectorTables.length === 0) return null;

        return (
          <div key={sector.id}>
            {renderTableSection(sectorTables, sector.name, sector.color)}
          </div>
        );
      })}

      {/* Tables without sector */}
      {tablesWithoutSector.length > 0 && (
        <div>
          {renderTableSection(tablesWithoutSector, "Sin Sector")}
        </div>
      )}

      {/* Empty State */}
      {activeTables.length === 0 && (
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
