/**
 * Floor Plan Grid System Constants
 * Centralized configuration for grid and table sizes
 */

/**
 * Grid size in pixels - the base unit for floor plan layout
 * All table positions snap to this grid
 */
export const GRID_SIZE = 100;

/**
 * Default shape dimensions for different table types
 * Normal tables (CIRCLE, SQUARE, RECTANGLE) fit within a single grid cell with padding
 * WIDE tables span multiple cells but leave room for outline highlights
 */
export const shapeDefaults = {
  CIRCLE: { width: 80, height: 80 },
  SQUARE: { width: 80, height: 80 },
  RECTANGLE: { width: 180, height: 80 },
  WIDE: { width: 380, height: 95 }, // 95% of 4 grid cells (400px)
} as const;

/**
 * Visual styling constants
 */
export const WAITER_OUTLINE_WIDTH = 4; // Width of the yellow outline when waiter is assigned
export const WAITER_OUTLINE_COLOR = "#eab308"; // Yellow color for waiter highlight
export const WAITER_OUTLINE_OFFSET = 6; // Offset from table edge