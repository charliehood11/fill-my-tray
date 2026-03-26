
export interface Dimensions {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Tray {
  id: string;
  width: number;
  depth: number;
  name?: string;
}

export interface Component {
  id: string;
  w: number;
  d: number;
  name?: string;
  numBatches?: number;  // Number of batches of this component
  batchSize?: number;   // Number of parts per batch
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface PlacedComponent extends Position {
  id: string;
  w: number;
  d: number;
  name?: string;
  width: number; // Actual width after rotation (or cell-spanning width in grid mode)
  height: number; // Actual height after rotation (or cell height in grid mode)
  rotation: 0 | 45 | 90; // 0 = original, 45 = diagonal, 90 = rotated
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface TrayResult {
  tray: Tray;
  trayNumber: number;
  placedComponents: PlacedComponent[];
  totalArea: number;
  usedArea: number;
  efficiency: number;
  remainingSpace: FreeSpace[];
}

export interface PackingResult {
  trayResults: TrayResult[];
  unplacedComponents: Component[];
  totalTraysUsed: number;
  totalComponentsPlaced: number;  // batches placed in grid mode, individual parts in precise/diagonal mode
  averageEfficiency: number;
  recommendations: Component[];
}

export interface FreeSpace {
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
}

export interface PackingOptions {
  spacing: number;
  edgeSpacing: number;
  allowRotation: boolean;
  optimizationLevel: 'fast' | 'balanced' | 'thorough';
  packingMode?: 'precise' | 'grid' | 'diagonal';
  gridColumns?: number; // Default 12 — columns per flight bar
  gridRows?: number;   // Default 5  — number of flight bars
  randomize?: boolean;          // Diagonal mode: randomise part order
  diagonalMinPerBar?: number;   // Diagonal mode: min parts per flight bar (default 1)
  diagonalMaxPerBar?: number;   // Diagonal mode: max parts per flight bar (default 4)
}
