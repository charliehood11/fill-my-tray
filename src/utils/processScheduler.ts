import { FlightBarData, OperationsData, ProcessingResult, FlightBarProcessing, ProcessingStep, TravelTimes, StationCapacity, GanttTask } from '../types/processing';

export class ProcessScheduler {
  private operations: OperationsData;
  private travelTimes: TravelTimes | null;
  private timeMultiplier: number;
  private stationCapacities: StationCapacity;

  constructor(operations: OperationsData, travelTimes: TravelTimes | null = null, timeMultiplier: number = 1.0, stationCapacities: StationCapacity = {}) {
    this.operations = operations;
    this.travelTimes = travelTimes;
    this.timeMultiplier = timeMultiplier;
    this.stationCapacities = stationCapacities;
  }

  calculateMinimumProcessingTime(flightBars: FlightBarData[], shiftLength?: number): ProcessingResult {
    console.log('Starting process scheduling calculation for', flightBars.length, 'flight bars');
    console.log('Travel times enabled:', !!this.travelTimes);
    console.log('Time multiplier:', this.timeMultiplier);
    console.log('Station capacities:', this.stationCapacities);
    console.log('Shift length:', shiftLength);

    // Track station usage over time
    const stationSchedules: { [station: string]: Array<{ start: number; end: number; flightBarId: string }> } = {};

    const flightBarProcessings: FlightBarProcessing[] = [];
    let totalMinTime = 0;
    let totalMaxTime = 0;
    let totalEstimatedTime = 0;
    let totalTravelTime = 0;

    // Process each flight bar with capacity constraints
    for (const flightBar of flightBars) {
      const processing = this.processFlightBarWithCapacity(flightBar, stationSchedules);
      flightBarProcessings.push(processing);
      
      // Update totals - use the actual processing time for individual flight bars
      totalMinTime = Math.max(totalMinTime, processing.totalMinTime);
      totalMaxTime = Math.max(totalMaxTime, processing.totalMaxTime);
      totalTravelTime = Math.max(totalTravelTime, processing.totalTravelTime);
    }

    // Calculate the actual cycle time (time to complete one set of all flight bars)
    const actualCycleTime = Math.max(...flightBarProcessings.map(fb => 
      fb.steps[fb.steps.length - 1]?.endTime || fb.totalEstimatedTime
    ));

    // For display purposes, use the longest individual flight bar processing time
    const longestFlightBarTime = Math.max(...flightBarProcessings.map(fb => fb.totalEstimatedTime));
    totalEstimatedTime = longestFlightBarTime;

    // Find critical path and bottlenecks
    const criticalPath = this.findCriticalPath(flightBarProcessings);
    const bottleneckOperations = this.findBottleneckOperations(flightBarProcessings);

    // Generate Gantt chart data
    const ganttTasks = this.generateGanttTasks(flightBarProcessings);

    // Calculate maximum runs in shift length based on the cycle time
    let maxRuns: number | undefined;
    if (shiftLength) {
      // Use the longest individual flight bar time as the cycle time for runs calculation
      maxRuns = Math.floor(shiftLength / totalEstimatedTime);
      console.log(`Shift length: ${shiftLength}, Cycle time: ${totalEstimatedTime}, Max runs: ${maxRuns}`);
    }

    const result: ProcessingResult = {
      flightBars: flightBarProcessings,
      totalMinTime,
      totalMaxTime,
      totalEstimatedTime,
      totalTravelTime,
      criticalPath,
      shiftLength,
      maxRuns,
      ganttTasks,
      summary: {
        totalFlightBars: flightBars.length,
        averageEfficiency: flightBars.reduce((sum, fb) => sum + fb.efficiency, 0) / flightBars.length,
        bottleneckOperations
      }
    };

    console.log('Processing calculation complete:', result);
    return result;
  }

  private processFlightBarWithCapacity(flightBar: FlightBarData, stationSchedules: { [station: string]: Array<{ start: number; end: number; flightBarId: string }> }): FlightBarProcessing {
    const operations = this.operations[flightBar.kNumber];
    
    if (!operations) {
      console.warn(`No operations found for K-number: ${flightBar.kNumber}`);
      return {
        flightBarId: flightBar.id,
        kNumber: flightBar.kNumber,
        componentCount: flightBar.componentCount,
        steps: [],
        totalMinTime: 0,
        totalMaxTime: 0,
        totalEstimatedTime: 0,
        totalTravelTime: 0
      };
    }

    const steps: ProcessingStep[] = [];
    let currentTime = 0;

    for (let index = 0; index < operations.length; index++) {
      const [operation, minTime, maxTime] = operations[index];
      
      // Fix: Don't multiply by component count - the base times already represent per-component times
      // Apply time multiplier to get estimated time
      const estimatedTime = minTime * this.timeMultiplier;
      
      // Calculate travel time from previous operation
      let travelTimeFromPrevious = 0;
      if (index > 0 && this.travelTimes) {
        const previousOperation = operations[index - 1][0];
        travelTimeFromPrevious = this.travelTimes[previousOperation]?.[operation] || 0;
      }

      // Find earliest available time for this station
      const capacity = this.stationCapacities[operation] || 1;
      const earliestStart = this.findEarliestAvailableTime(operation, currentTime + travelTimeFromPrevious, estimatedTime, stationSchedules, capacity);
      
      const step: ProcessingStep = {
        operation,
        minTime: minTime,
        maxTime: maxTime,
        estimatedTime: estimatedTime,
        travelTimeFromPrevious,
        startTime: earliestStart,
        endTime: earliestStart + estimatedTime
      };

      // Reserve the station
      if (!stationSchedules[operation]) {
        stationSchedules[operation] = [];
      }
      stationSchedules[operation].push({
        start: earliestStart,
        end: earliestStart + estimatedTime,
        flightBarId: flightBar.id
      });

      steps.push(step);
      currentTime = step.endTime!;
    }

    const totalMinTime = steps.reduce((sum, step) => sum + step.minTime + (step.travelTimeFromPrevious || 0), 0);
    const totalMaxTime = steps.reduce((sum, step) => sum + step.maxTime + (step.travelTimeFromPrevious || 0), 0);
    const totalEstimatedTime = steps.reduce((sum, step) => sum + step.estimatedTime + (step.travelTimeFromPrevious || 0), 0);
    const totalTravelTime = steps.reduce((sum, step) => sum + (step.travelTimeFromPrevious || 0), 0);

    return {
      flightBarId: flightBar.id,
      kNumber: flightBar.kNumber,
      componentCount: flightBar.componentCount,
      steps,
      totalMinTime,
      totalMaxTime,
      totalEstimatedTime,
      totalTravelTime
    };
  }

  private findEarliestAvailableTime(
    station: string, 
    requestedStartTime: number, 
    duration: number, 
    stationSchedules: { [station: string]: Array<{ start: number; end: number; flightBarId: string }> },
    capacity: number
  ): number {
    if (!stationSchedules[station] || stationSchedules[station].length === 0) {
      return requestedStartTime;
    }

    const schedule = stationSchedules[station].sort((a, b) => a.start - b.start);
    const requestedEndTime = requestedStartTime + duration;

    // Find a time slot where we don't exceed capacity
    let testStartTime = requestedStartTime;
    
    while (true) {
      const testEndTime = testStartTime + duration;
      
      // Count how many jobs overlap with this time window
      const overlappingJobs = schedule.filter(job => 
        (testStartTime < job.end && testEndTime > job.start)
      );

      if (overlappingJobs.length < capacity) {
        return testStartTime;
      }

      // Find the next time when a job ends
      const nextAvailableTime = Math.min(...overlappingJobs.map(job => job.end));
      testStartTime = Math.max(testStartTime + 0.1, nextAvailableTime);
    }
  }

  private generateGanttTasks(processings: FlightBarProcessing[]): GanttTask[] {
    const tasks: GanttTask[] = [];
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280', '#84CC16'];
    
    processings.forEach((processing, index) => {
      const color = colors[index % colors.length];
      
      processing.steps.forEach((step, stepIndex) => {
        if (step.startTime !== undefined && step.endTime !== undefined) {
          tasks.push({
            id: `${processing.flightBarId}-${stepIndex}`,
            name: `${processing.flightBarId} - ${step.operation}`,
            start: step.startTime,
            end: step.endTime,
            operation: step.operation,
            flightBarId: processing.flightBarId,
            color
          });
        }
      });
    });
    
    return tasks;
  }

  private findCriticalPath(processings: FlightBarProcessing[]): string[] {
    // Find the flight bar with the longest processing time
    const longestProcessing = processings.reduce((longest, current) => 
      current.totalEstimatedTime > longest.totalEstimatedTime ? current : longest
    );

    return [
      `Flight Bar: ${longestProcessing.flightBarId}`,
      `K-Number: ${longestProcessing.kNumber}`,
      `Estimated Time: ${longestProcessing.totalEstimatedTime.toFixed(1)} minutes`
    ];
  }

  private findBottleneckOperations(processings: FlightBarProcessing[]): string[] {
    const operationTimes: { [operation: string]: number } = {};

    // Aggregate operation times across all flight bars
    processings.forEach(processing => {
      processing.steps.forEach(step => {
        operationTimes[step.operation] = (operationTimes[step.operation] || 0) + step.estimatedTime;
      });
    });

    // Sort operations by total time and return top 3
    return Object.entries(operationTimes)
      .sort(([, timeA], [, timeB]) => timeB - timeA)
      .slice(0, 3)
      .map(([operation]) => operation);
  }
}
