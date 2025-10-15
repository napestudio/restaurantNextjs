"use client";

interface TableCardProps {
  tableNumber: number;
  capacity: number;
  isActive: boolean;
  currentReservation?: {
    customerName: string;
    people: number;
    timeSlot: {
      startTime: string;
      endTime: string;
    } | null;
  } | null;
}

export function TableCard({
  tableNumber,
  capacity,
  isActive,
  currentReservation,
}: TableCardProps) {
  const isOccupied = !!currentReservation;

  const getStatusColor = () => {
    if (!isActive) return "bg-gray-200 border-gray-300";
    if (isOccupied) return "bg-red-50 border-red-300";
    return "bg-green-50 border-green-300";
  };

  const getStatusText = () => {
    if (!isActive) return "Inactiva";
    if (isOccupied) return "Ocupada";
    return "Disponible";
  };

  const getStatusTextColor = () => {
    if (!isActive) return "text-gray-600";
    if (isOccupied) return "text-red-700";
    return "text-green-700";
  };

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timeString;
    }
  };

  return (
    <div
      className={`
        relative rounded-lg border-2 p-4 transition-all hover:shadow-md
        ${getStatusColor()}
      `}
    >
      {/* Table Number - Large and prominent */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-3xl font-bold text-gray-900">
            {tableNumber}
          </div>
          <div className={`text-xs font-medium ${getStatusTextColor()}`}>
            {getStatusText()}
          </div>
        </div>

        {/* Capacity indicator */}
        <div className="flex items-center gap-1 text-gray-600">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <span className="text-sm font-medium">{capacity}</span>
        </div>
      </div>

      {/* Reservation Details */}
      {isOccupied && currentReservation && (
        <div className="mt-3 pt-3 border-t border-red-200 space-y-1">
          <div className="text-sm font-medium text-gray-900 truncate">
            {currentReservation.customerName}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span>{currentReservation.people} personas</span>
            </div>
            {currentReservation.timeSlot && (
              <div className="flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  {formatTime(currentReservation.timeSlot.startTime)} -{" "}
                  {formatTime(currentReservation.timeSlot.endTime)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state for available tables */}
      {!isOccupied && isActive && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <div className="text-xs text-gray-500 text-center">
            Lista para recibir clientes
          </div>
        </div>
      )}
    </div>
  );
}
