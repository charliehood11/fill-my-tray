
export interface FlightBarData {
  id: string;
  kNumber: string;
  componentCount: number;
  efficiency: number;
}

export type Operation = [string, number, number]; // [operation_name, min_time, max_time]

export interface OperationsData {
  [kNumber: string]: Operation[];
}

export interface TravelTimes {
  [fromOperation: string]: {
    [toOperation: string]: number;
  };
}

export interface StationLayout {
  [stationName: string]: {
    row: number;
    x: number;
  };
}

export interface StationCapacity {
  [stationName: string]: number;
}

export interface ProcessingStep {
  operation: string;
  minTime: number;
  maxTime: number;
  estimatedTime: number;
  travelTimeFromPrevious?: number;
  startTime?: number;
  endTime?: number;
}

export interface FlightBarProcessing {
  flightBarId: string;
  kNumber: string;
  componentCount: number;
  steps: ProcessingStep[];
  totalMinTime: number;
  totalMaxTime: number;
  totalEstimatedTime: number;
  totalTravelTime: number;
}

export interface GanttTask {
  id: string;
  name: string;
  start: number;
  end: number;
  operation: string;
  flightBarId: string;
  color: string;
}

export interface ProcessingResult {
  flightBars: FlightBarProcessing[];
  totalMinTime: number;
  totalMaxTime: number;
  totalEstimatedTime: number;
  totalTravelTime: number;
  criticalPath: string[];
  shiftLength?: number;
  maxRuns?: number;
  ganttTasks?: GanttTask[];
  summary: {
    totalFlightBars: number;
    averageEfficiency: number;
    bottleneckOperations: string[];
  };
}
