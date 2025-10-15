import type React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ZoomIn, ZoomOut, Grid3x3 } from "lucide-react";

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

interface FloorPlanCanvasProps {
  tables: FloorTable[];
  selectedTable: string | null;
  draggedTable: string | null;
  zoom: number;
  showGrid: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
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

export function FloorPlanCanvas({
  tables,
  selectedTable,
  draggedTable,
  zoom,
  showGrid,
  svgRef,
  onTableMouseDown,
  onZoomIn,
  onZoomOut,
  onToggleGrid,
}: FloorPlanCanvasProps) {
  const renderTable = (table: FloorTable) => {
    const isSelected = selectedTable === table.id;
    const centerX = table.x + table.width / 2;
    const centerY = table.y + table.height / 2;

    return (
      <g
        key={table.id}
        onMouseDown={(e) => onTableMouseDown(e, table.id)}
        style={{ cursor: "move" }}
        transform={`rotate(${table.rotation} ${centerX} ${centerY})`}
      >
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

        {/* Table number */}
        <text
          x={centerX}
          y={centerY - 5}
          textAnchor="middle"
          fill="#fff"
          fontSize="16"
          fontWeight="bold"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {table.number}
        </text>

        {/* Capacity */}
        <text
          x={centerX}
          y={centerY + 15}
          textAnchor="middle"
          fill="#fff"
          fontSize="12"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {table.currentGuests}/{table.capacity}
        </text>
      </g>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Plano del Salón</CardTitle>
          <div className="flex items-center space-x-2">
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
              {Math.round(zoom * 100)}%
            </span>
            <Button size="sm" variant="outline" onClick={onZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="border rounded-lg overflow-auto bg-gray-100"
          style={{ height: "600px" }}
        >
          <svg
            ref={svgRef}
            width={800 * zoom}
            height={600 * zoom}
            viewBox="0 0 800 600"
            className="bg-white"
            style={{ cursor: draggedTable ? "grabbing" : "default" }}
          >
            {/* Grid */}
            {showGrid && (
              <defs>
                <pattern
                  id="grid"
                  width="50"
                  height="50"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 50 0 L 0 0 0 50"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
            )}
            {showGrid && <rect width="800" height="600" fill="url(#grid)" />}

            {/* Tables */}
            {tables.map((table) => renderTable(table))}
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
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
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500" />
            <span>Limpiando</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
