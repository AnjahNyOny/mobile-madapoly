import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// The board is a square. We use the screen width as the reference.
// The board will be slightly larger than the screen to allow camera panning.
export const BOARD_SIZE = SCREEN_WIDTH * 1.8;

// Corner tiles are square, side tiles are narrower rectangles.
// The board has 11 positions per side (including 2 corners).
// Corner size is roughly 1.5x the width of a side tile.
const CORNER_RATIO = 1.5;
// 2 corners + 9 side tiles per side = BOARD_SIZE
// 2 * CORNER_RATIO * sideTileWidth + 9 * sideTileWidth = BOARD_SIZE
// sideTileWidth * (2 * CORNER_RATIO + 9) = BOARD_SIZE
export const SIDE_TILE_WIDTH = BOARD_SIZE / (2 * CORNER_RATIO + 9);
export const CORNER_TILE_SIZE = SIDE_TILE_WIDTH * CORNER_RATIO;
// Side tiles are taller (depth of the border strip)
export const SIDE_TILE_HEIGHT = CORNER_TILE_SIZE;

/**
 * Determines if a board index is a corner tile.
 * Corners are at indices 0 (GO), 10 (Jail), 20 (Free Parking), 30 (Go to Jail).
 */
export const isCornerIndex = (index: number): boolean => {
  return index === 0 || index === 10 || index === 20 || index === 30;
};

/**
 * Returns which side a tile belongs to.
 * 'bottom' = indices 0-10, 'left' = 11-20, 'top' = 21-30, 'right' = 31-39
 */
export const getSide = (index: number): 'bottom' | 'left' | 'top' | 'right' => {
  if (index <= 10) return 'bottom';
  if (index <= 20) return 'left';
  if (index <= 30) return 'top';
  return 'right';
};

export interface TileLayout {
  x: number;      // left position in pixels
  y: number;      // top position in pixels
  width: number;  // tile width in pixels
  height: number; // tile height in pixels
  rotation: number; // rotation in degrees for text orientation
  side: 'bottom' | 'left' | 'top' | 'right';
  isCorner: boolean;
}

/**
 * Returns the pixel-based layout for a given board index (0-39).
 * Origin (0,0) is the top-left of the board square.
 *
 * Board layout (viewed from above):
 *   [20] [21] [22] ... [29] [30]    ← top row
 *   [19]                   [31]
 *   [18]                   [32]
 *   ...      (center)      ...
 *   [12]                   [38]
 *   [11]                   [39]
 *   [10] [9]  [8]  ... [1]  [0]    ← bottom row
 */
export const getTileLayout = (index: number): TileLayout => {
  const corner = isCornerIndex(index);
  const side = getSide(index);

  if (corner) {
    // Corners are square tiles at fixed positions
    let x = 0, y = 0;
    switch (index) {
      case 0:  // GO — bottom-right
        x = BOARD_SIZE - CORNER_TILE_SIZE;
        y = BOARD_SIZE - CORNER_TILE_SIZE;
        break;
      case 10: // Jail — bottom-left
        x = 0;
        y = BOARD_SIZE - CORNER_TILE_SIZE;
        break;
      case 20: // Free Parking — top-left
        x = 0;
        y = 0;
        break;
      case 30: // Go to Jail — top-right
        x = BOARD_SIZE - CORNER_TILE_SIZE;
        y = 0;
        break;
    }
    return { x, y, width: CORNER_TILE_SIZE, height: CORNER_TILE_SIZE, rotation: 0, side, isCorner: true };
  }

  // Non-corner tiles
  let x = 0, y = 0, width = 0, height = 0, rotation = 0;

  switch (side) {
    case 'bottom': {
      // Indices 1-9, right to left along the bottom edge
      // Position 1 is just left of corner 0, position 9 is just right of corner 10
      const posFromRight = index; // 1 = closest to GO, 9 = closest to Jail
      x = BOARD_SIZE - CORNER_TILE_SIZE - posFromRight * SIDE_TILE_WIDTH;
      y = BOARD_SIZE - SIDE_TILE_HEIGHT;
      width = SIDE_TILE_WIDTH;
      height = SIDE_TILE_HEIGHT;
      rotation = 0;
      break;
    }
    case 'left': {
      // Indices 11-19, bottom to top along the left edge
      const posFromBottom = index - 10; // 1 = closest to Jail, 9 = closest to Free Parking
      x = 0;
      y = BOARD_SIZE - CORNER_TILE_SIZE - posFromBottom * SIDE_TILE_WIDTH;
      width = SIDE_TILE_HEIGHT; // swapped: the "depth" goes horizontally
      height = SIDE_TILE_WIDTH;
      rotation = 0;
      break;
    }
    case 'top': {
      // Indices 21-29, left to right along the top edge
      const posFromLeft = index - 20; // 1 = closest to Free Parking, 9 = closest to Go to Jail
      x = CORNER_TILE_SIZE + (posFromLeft - 1) * SIDE_TILE_WIDTH;
      y = 0;
      width = SIDE_TILE_WIDTH;
      height = SIDE_TILE_HEIGHT;
      rotation = 0;
      break;
    }
    case 'right': {
      // Indices 31-39, top to bottom along the right edge
      const posFromTop = index - 30; // 1 = closest to Go to Jail, 9 = closest to GO
      x = BOARD_SIZE - SIDE_TILE_HEIGHT; // "depth" goes left from the right edge
      y = CORNER_TILE_SIZE + (posFromTop - 1) * SIDE_TILE_WIDTH;
      width = SIDE_TILE_HEIGHT;
      height = SIDE_TILE_WIDTH;
      rotation = 0;
      break;
    }
  }

  return { x, y, width, height, rotation, side, isCorner: false };
};

/**
 * Returns the center point of a tile (used for token placement).
 */
export const getTileCenter = (index: number): { x: number; y: number } => {
  const layout = getTileLayout(index);
  return {
    x: layout.x + layout.width / 2,
    y: layout.y + layout.height / 2,
  };
};

export const formatCurrency = (value: number) => {
  return `${value} AR`;
};
