import { Button } from "@/components/ui/button";
import type { FloorTable } from "@/lib/floor-plan-utils";
import { Grid3x3, ZoomIn, ZoomOut } from "lucide-react";
import type React from "react";
import { memo, useMemo } from "react";

interface FloorPlanCanvasProps {
  tables: FloorTable[];
  selectedTable: string | null;
  draggedTable: string | null;
  zoom: number;
  showGrid: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  canvasWidth: number;
  canvasHeight: number;
  onTableMouseDown: (e: React.MouseEvent, tableId: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleGrid: () => void;
}

const statusColors = {
  empty: "#22c55e",
  occupied: "#ef4444",
  reserved: "#3b82f6",
  cleaning: "#eab308",
};

const statusStrokeColors = {
  empty: "#16a34a",
  occupied: "#dc2626",
  reserved: "#2563eb",
  cleaning: "#ca8a04",
};

const CANVAS_CONTAINER_HEIGHT = 600; // Height of the scrollable container

// Memoized Table Shape Component
const TableShape = memo(function TableShape({
  table,
  isSelected,
}: {
  table: FloorTable;
  isSelected: boolean;
}) {
  const centerX = table.x + table.width / 2;
  const centerY = table.y + table.height / 2;

  return (
    <g transform={`rotate(${table.rotation} ${centerX} ${centerY})`}>
      {/* Table shape */}
      {table.shape === "CIRCLE" && (
        <circle
          cx={centerX}
          cy={centerY}
          r={table.width / 2}
          fill={statusColors[table.status]}
          stroke={isSelected ? "#000" : statusStrokeColors[table.status]}
          strokeWidth={isSelected ? 3 : 2}
          opacity={0.9}
        />
      )}

      {table.shape === "SQUARE" && (
        <rect
          x={table.x}
          y={table.y}
          width={table.width}
          height={table.height}
          fill={statusColors[table.status]}
          stroke={isSelected ? "#000" : statusStrokeColors[table.status]}
          strokeWidth={isSelected ? 3 : 2}
          rx={8}
          opacity={0.9}
        />
      )}

      {table.shape === "RECTANGLE" && (
        <rect
          x={table.x}
          y={table.y}
          width={table.width}
          height={table.height}
          fill={statusColors[table.status]}
          stroke={isSelected ? "#000" : statusStrokeColors[table.status]}
          strokeWidth={isSelected ? 3 : 2}
          rx={8}
          opacity={0.9}
        />
      )}

      {table.shape === "WIDE" && (
        <rect
          x={table.x}
          y={table.y}
          width={table.width}
          height={table.height}
          fill={statusColors[table.status]}
          stroke={isSelected ? "#000" : statusStrokeColors[table.status]}
          strokeWidth={isSelected ? 3 : 2}
          rx={8}
          opacity={0.9}
        />
      )}

      {/* Table number - counter-rotated to stay upright */}
      <text
        x={centerX}
        y={centerY}
        textAnchor="middle"
        fill="#fff"
        fontSize="24"
        fontWeight="bold"
        style={{ pointerEvents: "none", userSelect: "none" }}
        transform={`rotate(${-table.rotation} ${centerX} ${centerY})`}
      >
        {table.number}
      </text>

      {/* Party size with Users icon - counter-rotated to stay upright */}
      {table.currentGuests > 0 && (
        <g transform={`rotate(${-table.rotation} ${centerX} ${centerY + 20})`}>
          {/* Users icon (SVG path) */}
          <g
            transform={`translate(${centerX - 10}, ${centerY + 10})`}
            style={{ pointerEvents: "none" }}
          >
            <path
              d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              transform="scale(0.5)"
            />
          </g>
          {/* Party size text */}
          <text
            x={centerX + 8}
            y={centerY + 22}
            textAnchor="middle"
            fill="#fff"
            fontSize="16"
            fontWeight="600"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {table.currentGuests}
          </text>
        </g>
      )}

      {/* Shared table indicator - rotates with table, text stays upright */}
      {table.isShared && (
        <>
          <circle
            cx={table.x + table.width - 15}
            cy={table.y + 15}
            r="10"
            fill="#fff"
            opacity={0.9}
            style={{ pointerEvents: "none" }}
          />
          <text
            x={table.x + table.width - 15}
            y={table.y + 19}
            textAnchor="middle"
            fill="#000"
            fontSize="14"
            fontWeight="bold"
            style={{ pointerEvents: "none", userSelect: "none" }}
            transform={`rotate(${-table.rotation} ${
              table.x + table.width - 15
            } ${table.y + 15})`}
          >
            C
          </text>
        </>
      )}
    </g>
  );
});

export const FloorPlanCanvas = memo(function FloorPlanCanvas({
  tables,
  selectedTable,
  draggedTable,
  zoom,
  showGrid,
  svgRef,
  canvasWidth,
  canvasHeight,
  onTableMouseDown,
  onZoomIn,
  onZoomOut,
  onToggleGrid,
}: FloorPlanCanvasProps) {
  // Memoize zoom percentage display
  const zoomPercentage = useMemo(() => Math.round(zoom * 100), [zoom]);

  // Memoize cursor style
  const cursorStyle = useMemo(
    () => (draggedTable ? "grabbing" : "default"),
    [draggedTable]
  );

  return (
    <div>
      <div className="relative">
        {/* Floating toolbar in top right - fixed position */}
        <div className="absolute top-4 right-12 z-10 flex items-center space-x-2 bg-white rounded-lg shadow-lg p-2 opacity-65 hover:opacity-100 transition-opacity pointer-events-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleGrid}
            className={showGrid ? "bg-blue-50" : ""}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={onZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-12 text-center">
            {zoomPercentage}%
          </span>
          <Button size="sm" variant="outline" onClick={onZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        <div
          className="border overflow-auto bg-gray-100 h-[calc(100svh-120px)]"
          // style={{ height: `${CANVAS_CONTAINER_HEIGHT + 100}px` }}
        >
          <svg
            ref={svgRef}
            width={canvasWidth * zoom}
            height={canvasHeight * zoom}
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            className="bg-white"
            style={{ cursor: cursorStyle }}
          >
            {/* Grid */}
            {showGrid && (
              <defs>
                <pattern
                  id="grid"
                  width="100"
                  height="100"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 100 0 L 0 0 0 100"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                  />
                </pattern>
              </defs>
            )}
            {showGrid && (
              <rect
                width={canvasWidth}
                height={canvasHeight}
                fill="url(#grid)"
              />
            )}

            {/* Tables */}
            {tables.map((table) => (
              <g
                key={table.id}
                onMouseDown={(e) => onTableMouseDown(e, table.id)}
                style={{ cursor: "move" }}
              >
                <TableShape
                  table={table}
                  isSelected={selectedTable === table.id}
                />
              </g>
            ))}
          </svg>
        </div>

        {/* Legend */}
        {/* <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-green-500" />
            <span>Disponible</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-red-500" />
            <span>Ocupada</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-blue-500" />
            <span>Reservada</span>
          </div> */}
        {/* <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500" />
            <span>Limpiando</span>
          </div> */}
        {/* </div> */}
      </div>
    </div>
  );
});
