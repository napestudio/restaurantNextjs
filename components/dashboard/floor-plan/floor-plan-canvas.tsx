import { Button } from "@/components/ui/button";
import type { FloorTable } from "@/lib/floor-plan-utils";
import { Grid3x3, ZoomIn, ZoomOut } from "lucide-react";
import type React from "react";
import { memo, useMemo, useState, useCallback } from "react";
import {
  GRID_SIZE,
  WAITER_OUTLINE_WIDTH,
  WAITER_OUTLINE_COLOR,
  WAITER_OUTLINE_OFFSET,
} from "@/lib/floor-plan-constants";

interface FloorPlanCanvasProps {
  tables: FloorTable[];
  selectedTable: string | null;
  draggedTable: string | null;
  zoom: number;
  showGrid: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  canvasWidth: number;
  canvasHeight: number;
  isEditMode: boolean;
  editModeOnly?: boolean;
  onTableMouseDown: (e: React.MouseEvent, tableId: string) => void;
  onCanvasClick?: (x: number, y: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleGrid: () => void;
  onRotateTable?: (tableId: string) => void;
  onResizeTable?: (tableId: string) => void;
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

// Edit mode colors (gray)
const editModeColors = {
  fill: "#9ca3af", // gray-400
  stroke: "#6b7280", // gray-500
};

// Memoized Table Shape Component
// Note: table.x and table.y are CENTER coordinates
const TableShape = memo(function TableShape({
  table,
  isSelected,
  isHovered,
  editModeOnly,
  onRotate,
  onResize,
}: {
  table: FloorTable;
  isSelected: boolean;
  isHovered: boolean;
  editModeOnly?: boolean;
  onRotate?: (tableId: string) => void;
  onResize?: (tableId: string) => void;
}) {
  // Determine colors based on edit mode
  const fillColor = editModeOnly
    ? editModeColors.fill
    : statusColors[table.status];
  const strokeColor = editModeOnly
    ? editModeColors.stroke
    : statusStrokeColors[table.status];
  // table.x and table.y are already the center
  const centerX = table.x;
  const centerY = table.y;
  // Calculate top-left for rect elements
  const topLeftX = table.x - table.width / 2;
  const topLeftY = table.y - table.height / 2;

  return (
    <g transform={`rotate(${table.rotation} ${centerX} ${centerY})`}>
      {/* Selection highlight outline (rendered behind the table) */}
      {isSelected && table.shape === "CIRCLE" && (
        <circle
          cx={centerX}
          cy={centerY}
          r={table.width / 2 + WAITER_OUTLINE_OFFSET}
          fill="none"
          stroke={WAITER_OUTLINE_COLOR}
          strokeWidth={WAITER_OUTLINE_WIDTH}
          opacity={0.8}
          style={{ pointerEvents: "none" }}
        />
      )}

      {isSelected &&
        (table.shape === "SQUARE" ||
          table.shape === "RECTANGLE" ||
          table.shape === "WIDE") && (
          <rect
            x={topLeftX - WAITER_OUTLINE_OFFSET}
            y={topLeftY - WAITER_OUTLINE_OFFSET}
            width={table.width + WAITER_OUTLINE_OFFSET * 2}
            height={table.height + WAITER_OUTLINE_OFFSET * 2}
            fill="none"
            stroke={WAITER_OUTLINE_COLOR}
            strokeWidth={WAITER_OUTLINE_WIDTH}
            rx={12}
            opacity={0.8}
            style={{ pointerEvents: "none" }}
          />
        )}

      {/* Table shape */}
      {table.shape === "CIRCLE" && (
        <circle
          cx={centerX}
          cy={centerY}
          r={table.width / 2}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={isSelected ? 3 : 2}
          opacity={0.9}
        />
      )}

      {table.shape === "SQUARE" && (
        <rect
          x={topLeftX}
          y={topLeftY}
          width={table.width}
          height={table.height}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={isSelected ? 3 : 2}
          rx={8}
          opacity={0.9}
        />
      )}

      {table.shape === "RECTANGLE" && (
        <rect
          x={topLeftX}
          y={topLeftY}
          width={table.width}
          height={table.height}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={isSelected ? 3 : 2}
          rx={8}
          opacity={0.9}
        />
      )}

      {table.shape === "WIDE" && (
        <rect
          x={topLeftX}
          y={topLeftY}
          width={table.width}
          height={table.height}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={isSelected ? 3 : 2}
          rx={8}
          opacity={0.9}
        />
      )}

      {/* Hover icons for edit mode - positioned outside the rotation transform */}
      {editModeOnly && isHovered && (
        <g transform={`rotate(${-table.rotation} ${centerX} ${centerY})`}>
          {/* Rotate icon - only for RECTANGLE and WIDE shapes, top-right corner */}
          {(table.shape === "RECTANGLE" || table.shape === "WIDE") &&
            onRotate && (
              <g
                style={{ cursor: "pointer" }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onRotate(table.id);
                }}
              >
                <circle
                  cx={centerX + table.width / 2 - 20}
                  cy={centerY - table.height / 2 + 20}
                  r={14}
                  fill="#fff"
                  stroke="#6b7280"
                  strokeWidth={1}
                  opacity={0.95}
                />
                {/* RotateCw icon as SVG path */}
                <g
                  transform={`translate(${
                    centerX + table.width / 2 - 20 - 7
                  }, ${centerY - table.height / 2 + 20 - 7})`}
                >
                  <path
                    d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8"
                    stroke="#4b5563"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    transform="scale(0.58)"
                  />
                </g>
              </g>
            )}

          {/* Resize icon - bottom-right corner */}
          {onResize && (
            <g
              style={{ cursor: "pointer" }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onResize(table.id);
              }}
            >
              <circle
                cx={centerX + table.width / 2 - 20}
                cy={centerY + table.height / 2 - 20}
                r={14}
                fill="#fff"
                stroke="#6b7280"
                strokeWidth={1}
                opacity={0.95}
              />
              {/* Maximize2 icon as SVG path */}
              <g
                transform={`translate(${centerX + table.width / 2 - 20 - 7}, ${
                  centerY + table.height / 2 - 20 - 7
                })`}
              >
                <path
                  d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
                  stroke="#4b5563"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  transform="scale(0.58)"
                />
              </g>
            </g>
          )}
        </g>
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

      {/* Party size with Users icon - counter-rotated to stay upright (hidden in edit mode) */}
      {!editModeOnly && table.currentGuests > 0 && (
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

      {/* Shared table indicator - rotates with table, text stays upright (hidden in edit mode) */}
      {table.isShared && (
        <>
          <circle
            cx={topLeftX + table.width - 15}
            cy={topLeftY + 15}
            r="10"
            fill="#fff"
            opacity={0.9}
            style={{ pointerEvents: "none" }}
          />
          <text
            x={topLeftX + table.width - 15}
            y={topLeftY + 19}
            textAnchor="middle"
            fill="#000"
            fontSize="14"
            fontWeight="bold"
            style={{ pointerEvents: "none", userSelect: "none" }}
            transform={`rotate(${-table.rotation} ${
              topLeftX + table.width - 15
            } ${topLeftY + 15})`}
          >
            C
          </text>
        </>
      )}

      {/* Waiter name - displayed inside the table below the number (hidden in edit mode) */}
      {!editModeOnly && table.hasWaiter && table.waiterName && (
        <text
          x={centerX}
          y={centerY + (table.currentGuests > 0 ? 35 : 18)}
          textAnchor="middle"
          fill="#fff"
          fontSize="12"
          fontWeight="600"
          style={{ pointerEvents: "none", userSelect: "none" }}
          transform={`rotate(${-table.rotation} ${centerX} ${
            centerY + (table.currentGuests > 0 ? 35 : 18)
          })`}
        >
          {table.waiterName.split(" ")[0]}
        </text>
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
  isEditMode,
  editModeOnly,
  onTableMouseDown,
  onCanvasClick,
  onZoomIn,
  onZoomOut,
  onToggleGrid,
  onRotateTable,
  onResizeTable,
}: FloorPlanCanvasProps) {
  // Track mouse position for hover effect
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null
  );

  // Track hovered table for showing icons
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);

  // Handle table hover
  const handleTableMouseEnter = useCallback(
    (tableId: string) => {
      if (editModeOnly) {
        setHoveredTable(tableId);
      }
    },
    [editModeOnly]
  );

  const handleTableMouseLeave = useCallback(() => {
    setHoveredTable(null);
  }, []);

  // Memoize zoom percentage display
  const zoomPercentage = useMemo(() => Math.round(zoom * 100), [zoom]);

  // Memoize cursor style
  const cursorStyle = useMemo(() => {
    if (draggedTable) return "grabbing";
    if (isEditMode && !draggedTable) return "crosshair";
    return "default";
  }, [draggedTable, isEditMode]);

  // Check if a grid cell is occupied by any table
  // Note: table.x and table.y are CENTER coordinates
  const isGridCellOccupied = (
    cellCenterX: number,
    cellCenterY: number
  ): boolean => {
    return tables.some((table) => {
      // table.x and table.y are already center coordinates
      const tableCenterX = table.x;
      const tableCenterY = table.y;

      // Calculate the table's bounding box in grid cells
      const tableLeft = tableCenterX - table.width / 2;
      const tableRight = tableCenterX + table.width / 2;
      const tableTop = tableCenterY - table.height / 2;
      const tableBottom = tableCenterY + table.height / 2;

      // Check if this cell's center falls within the table's bounds
      // Cell extends from (cellCenterX - 50) to (cellCenterX + 50)
      const cellLeft = cellCenterX - GRID_SIZE / 2;
      const cellRight = cellCenterX + GRID_SIZE / 2;
      const cellTop = cellCenterY - GRID_SIZE / 2;
      const cellBottom = cellCenterY + GRID_SIZE / 2;

      // Check for overlap between table and cell
      const overlapsX = tableLeft < cellRight && tableRight > cellLeft;
      const overlapsY = tableTop < cellBottom && tableBottom > cellTop;

      return overlapsX && overlapsY;
    });
  };

  // Handle mouse move on SVG
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isEditMode || draggedTable) {
      setMousePos(null);
      return;
    }

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Snap to grid intervals - show icon at center of grid cell
    const snappedX = Math.floor(x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    const snappedY = Math.floor(y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;

    // Don't show cursor if grid cell is occupied by a table
    if (isGridCellOccupied(snappedX, snappedY)) {
      setMousePos(null);
      return;
    }

    setMousePos({ x: snappedX, y: snappedY });
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setMousePos(null);
  };

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isEditMode || draggedTable) return;

    // Don't open dialog if clicking on a table or any interactive element
    const target = e.target as SVGElement;
    // Only allow clicks on the SVG itself or the grid rect
    if (
      target.tagName !== "svg" &&
      target.getAttribute("id") !== "grid-background"
    )
      return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Snap to grid intervals - return top-left corner for table placement
    const snappedX = Math.floor(x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.floor(y / GRID_SIZE) * GRID_SIZE;

    onCanvasClick?.(snappedX, snappedY);
  };

  return (
    <div>
      <div className="relative">
        {/* Floating toolbar in top right - fixed position */}
        <div className="absolute top-4 right-12 z-10 flex items-center space-x-2 bg-white rounded-lg shadow-lg p-2 opacity-45 hover:opacity-100 transition-opacity pointer-events-auto">
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
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleCanvasClick}
          >
            {/* Grid */}
            {showGrid && (
              <defs>
                <pattern
                  id="grid"
                  width={GRID_SIZE}
                  height={GRID_SIZE}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                  />
                </pattern>
              </defs>
            )}
            {showGrid && (
              <rect
                id="grid-background"
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
                onMouseEnter={() => handleTableMouseEnter(table.id)}
                onMouseLeave={handleTableMouseLeave}
                style={{ cursor: "move" }}
              >
                <TableShape
                  table={table}
                  isSelected={selectedTable === table.id}
                  isHovered={hoveredTable === table.id}
                  editModeOnly={editModeOnly}
                  onRotate={onRotateTable}
                  onResize={onResizeTable}
                />
              </g>
            ))}

            {/* Plus icon hover indicator in edit mode */}
            {isEditMode && mousePos && !draggedTable && (
              <g style={{ pointerEvents: "none" }} opacity={0.6}>
                {/* Circle background */}
                <circle
                  cx={mousePos.x}
                  cy={mousePos.y}
                  r={20}
                  fill="#ef4444"
                  stroke="#dc2626"
                  strokeWidth={2}
                />
                {/* Plus icon */}
                <line
                  x1={mousePos.x}
                  y1={mousePos.y - 10}
                  x2={mousePos.x}
                  y2={mousePos.y + 10}
                  stroke="white"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <line
                  x1={mousePos.x - 10}
                  y1={mousePos.y}
                  x2={mousePos.x + 10}
                  y2={mousePos.y}
                  stroke="white"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              </g>
            )}
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
