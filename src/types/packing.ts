
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
  quantity?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical'; // Priority categories
}

export interface PlacedComponent extends Position {
  id: string;
  w: number;
  d: number;
  name?: string;
  width: number; // Actual width after rotation
  height: number; // Actual height after rotation
  rotation: 0 | 90; // 0 = original orientation, 90 = rotated 90 degrees
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
  totalComponentsPlaced: number;
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
  spacing: number; // Default 100mm between components
  edgeSpacing: number; // Default 100mm from tray edges
  allowRotation: boolean;
  optimizationLevel: 'fast' | 'balanced' | 'thorough';
}
