
export interface Dimensions {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface FlightBar {
  id: string;
  width: number;
  depth: number;
  name?: string;
  k: string; // K-number constraint
}

export interface SchedulerComponent {
  id: string;
  w: number;
  d: number;
  k: string; // K-number that determines which flight bar it can go on
  name?: string;
  quantity?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface PlacedSchedulerComponent extends Position {
  id: string;
  w: number;
  d: number;
  k: string;
  name?: string;
  width: number;
  height: number;
  rotation: 0 | 90;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  flightBarId: string; // New field to track which flight bar this component is on
}

export interface FlightBarResult {
  flightBar: FlightBar;
  placedComponents: PlacedSchedulerComponent[];
  totalArea: number;
  usedArea: number;
  efficiency: number;
  remainingSpace: FreeSpace[];
}

export interface SchedulingResult {
  flightBarResults: FlightBarResult[]; // Changed from single flight bar to multiple
  unplacedComponents: SchedulerComponent[];
  totalFlightBars: number;
  recommendations: SchedulerComponent[];
}

export interface FreeSpace {
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
}

export interface SchedulingOptions {
  spacing: number;
  edgeSpacing: number;
  allowRotation: boolean;
  optimizationLevel: 'fast' | 'balanced' | 'thorough';
}
