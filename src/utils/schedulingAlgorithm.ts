import { SchedulerComponent, FlightBar, PlacedSchedulerComponent, FreeSpace, SchedulingResult, FlightBarResult, SchedulingOptions } from '../types/scheduler';

export class FlightBarScheduler {
  private spacing: number;
  private edgeSpacing: number;
  private allowRotation: boolean;
  private optimizationLevel: string;
  private readonly FLIGHT_BAR_WIDTH = 3000;
  private readonly FLIGHT_BAR_DEPTH = 1500;

  constructor(options: SchedulingOptions) {
    this.spacing = options.spacing;
    this.edgeSpacing = options.edgeSpacing;
    this.allowRotation = options.allowRotation;
    this.optimizationLevel = options.optimizationLevel;
  }

  // Main scheduling function - now handles multiple flight bars
  scheduleFlightBars(components: SchedulerComponent[]): SchedulingResult {
    console.log(`Starting scheduling optimization for components`);
    
    // Group components by K-number
    const componentsByK = this.groupComponentsByK(components);
    const flightBarResults: FlightBarResult[] = [];
    let unplacedComponents: SchedulerComponent[] = [];

    // Process each K-number group
    for (const [kNumber, kComponents] of Object.entries(componentsByK)) {
      console.log(`Processing K-number: ${kNumber} with ${kComponents.length} components`);
      
      // Expand components based on quantity
      const expandedComponents = this.expandComponentsByQuantity(kComponents);
      
      // Sort components by priority and then by area
      const sortedComponents = this.sortComponentsByPriority(expandedComponents);

      // Schedule components across multiple flight bars for this K-number
      const kResults = this.scheduleComponentsForK(kNumber, sortedComponents);
      flightBarResults.push(...kResults.flightBarResults);
      unplacedComponents.push(...kResults.unplacedComponents);
    }

    // Calculate recommendations from all remaining space
    const allFreeSpaces = flightBarResults.flatMap(result => result.remainingSpace);
    const recommendations = this.findRecommendations(components, allFreeSpaces, flightBarResults.flatMap(r => r.placedComponents));

    return {
      flightBarResults,
      unplacedComponents,
      totalFlightBars: flightBarResults.length,
      recommendations
    };
  }

  private groupComponentsByK(components: SchedulerComponent[]): {[k: string]: SchedulerComponent[]} {
    const grouped: {[k: string]: SchedulerComponent[]} = {};
    
    components.forEach(component => {
      if (!grouped[component.k]) {
        grouped[component.k] = [];
      }
      grouped[component.k].push(component);
    });
    
    return grouped;
  }

  private scheduleComponentsForK(kNumber: string, components: SchedulerComponent[]): {flightBarResults: FlightBarResult[], unplacedComponents: SchedulerComponent[]} {
    const flightBarResults: FlightBarResult[] = [];
    let remainingComponents = [...components];
    let flightBarIndex = 1;

    while (remainingComponents.length > 0) {
      const flightBar: FlightBar = {
        id: `${kNumber}_FB${flightBarIndex}`,
        width: this.FLIGHT_BAR_WIDTH,
        depth: this.FLIGHT_BAR_DEPTH,
        k: kNumber,
        name: `Flight Bar ${flightBarIndex} (${kNumber})`
      };

      const result = this.scheduleOnSingleFlightBar(flightBar, remainingComponents);
      
      if (result.placedComponents.length === 0) {
        // No more components can be placed, break to avoid infinite loop
        break;
      }

      flightBarResults.push(result);

      // Remove placed components from remaining components
      const placedIds = new Set(result.placedComponents.map(p => p.id));
      remainingComponents = remainingComponents.filter(comp => !placedIds.has(comp.id));
      
      flightBarIndex++;
    }

    return {
      flightBarResults,
      unplacedComponents: remainingComponents
    };
  }

  private scheduleOnSingleFlightBar(flightBar: FlightBar, components: SchedulerComponent[]): FlightBarResult {
    const placedComponents: PlacedSchedulerComponent[] = [];

    for (const component of components) {
      const placement = this.findBestPosition(flightBar, component, placedComponents);
      if (placement) {
        placement.flightBarId = flightBar.id;
        placedComponents.push(placement);
      }
    }

    const usedArea = placedComponents.reduce((sum, comp) => 
      sum + (comp.width * comp.height), 0
    );
    
    // Calculate efficiency as component area divided by total flight bar area
    const efficiency = this.calculateEfficiency(flightBar, placedComponents);
    
    return {
      flightBar,
      placedComponents,
      totalArea: flightBar.width * flightBar.depth,
      usedArea,
      efficiency,
      remainingSpace: this.calculateFreeSpaces(flightBar, placedComponents)
    };
  }

  // Updated efficiency calculation: component area / total flight bar area
  private calculateEfficiency(flightBar: FlightBar, placedComponents: PlacedSchedulerComponent[]): number {
    const totalFlightBarArea = flightBar.width * flightBar.depth;
    
    // Calculate total component area (actual parts area)
    const componentArea = placedComponents.reduce((sum, comp) => 
      sum + (comp.width * comp.height), 0
    );
    
    // Efficiency is simply component area divided by total flight bar area
    const efficiency = (componentArea / totalFlightBarArea) * 100;
    
    return Math.max(0, Math.min(100, efficiency));
  }

  // Calculate overlapping spacing area between two components
  private calculateSpacingOverlap(comp1: PlacedSchedulerComponent, comp2: PlacedSchedulerComponent): number {
    // Expanded rectangles including spacing
    const rect1 = {
      x: comp1.x - this.spacing,
      y: comp1.y - this.spacing,
      width: comp1.width + 2 * this.spacing,
      height: comp1.height + 2 * this.spacing
    };
    
    const rect2 = {
      x: comp2.x - this.spacing,
      y: comp2.y - this.spacing,
      width: comp2.width + 2 * this.spacing,
      height: comp2.height + 2 * this.spacing
    };
    
    // Calculate overlap
    const overlapLeft = Math.max(rect1.x, rect2.x);
    const overlapRight = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
    const overlapTop = Math.max(rect1.y, rect2.y);
    const overlapBottom = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);
    
    if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
      return (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
    }
    
    return 0;
  }

  // Calculate the actual usable area of the flight bar, accounting for spacing constraints
  private calculateUsableArea(flightBar: FlightBar, placedComponents: PlacedSchedulerComponent[]): number {
    // Simply calculate the area excluding edge spacing borders
    const usableWidth = flightBar.width - 2 * this.edgeSpacing;
    const usableHeight = flightBar.depth - 2 * this.edgeSpacing;
    const usableArea = Math.max(0, usableWidth * usableHeight);
    
    // Ensure we don't have negative usable area and maintain a minimum
    return Math.max(usableArea, flightBar.width * flightBar.depth * 0.1); // At least 10% usable
  }

  // Expand components based on quantity
  private expandComponentsByQuantity(components: SchedulerComponent[]): SchedulerComponent[] {
    const expanded: SchedulerComponent[] = [];
    
    components.forEach(component => {
      const quantity = component.quantity || 1;
      for (let i = 0; i < quantity; i++) {
        expanded.push({
          ...component,
          id: `${component.id}_${i + 1}`,
          quantity: 1
        });
      }
    });
    
    return expanded;
  }

  // Sort components by priority and area
  private sortComponentsByPriority(components: SchedulerComponent[]): SchedulerComponent[] {
    const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    
    return [...components].sort((a, b) => {
      const aPriority = priorityOrder[a.priority || 'medium'];
      const bPriority = priorityOrder[b.priority || 'medium'];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return (b.w * b.d) - (a.w * a.d);
    });
  }

  // Bottom-Left Fill algorithm with edge spacing
  private bottomLeftFill(flightBar: FlightBar, components: SchedulerComponent[]): FlightBarResult {
    const placedComponents: PlacedSchedulerComponent[] = [];

    for (const component of components) {
      const placement = this.findBestPosition(flightBar, component, placedComponents);
      if (placement) {
        placement.flightBarId = flightBar.id;
        placedComponents.push(placement);
      }
    }

    const usedArea = placedComponents.reduce((sum, comp) => 
      sum + (comp.width * comp.height), 0
    );
    
    const usableArea = this.calculateUsableArea(flightBar, placedComponents);
    
    return {
      flightBar,
      placedComponents,
      totalArea: flightBar.width * flightBar.depth,
      usedArea,
      efficiency: (usedArea / usableArea) * 100,
      remainingSpace: this.calculateFreeSpaces(flightBar, placedComponents)
    };
  }

  // Find the best position for a component with edge spacing
  private findBestPosition(flightBar: FlightBar, component: SchedulerComponent, placed: PlacedSchedulerComponent[]): PlacedSchedulerComponent | null {
    const orientations = this.allowRotation ? 
      [
        { width: component.w, height: component.d, rotation: 0 as const },
        { width: component.d, height: component.w, rotation: 90 as const }
      ] : 
      [{ width: component.w, height: component.d, rotation: 0 as const }];

    let bestPosition: PlacedSchedulerComponent | null = null;
    let bestScore = Infinity;

    for (const orientation of orientations) {
      const maxX = flightBar.width - orientation.width - this.edgeSpacing;
      const maxY = flightBar.depth - orientation.height - this.edgeSpacing;
      
      for (let y = this.edgeSpacing; y <= maxY; y += 10) {
        for (let x = this.edgeSpacing; x <= maxX; x += 10) {
          if (this.canPlaceAt(x, y, orientation.width, orientation.height, flightBar, placed)) {
            const score = y * 1000 + x;
            if (score < bestScore) {
              bestScore = score;
              bestPosition = {
                id: component.id,
                w: component.w,
                d: component.d,
                k: component.k,
                name: component.name,
                priority: component.priority,
                x,
                y,
                width: orientation.width,
                height: orientation.height,
                rotation: orientation.rotation,
                flightBarId: flightBar.id
              };
            }
          }
        }
      }
    }

    return bestPosition;
  }

  // Check if a component can be placed at a specific position
  private canPlaceAt(x: number, y: number, width: number, height: number, flightBar: FlightBar, placed: PlacedSchedulerComponent[]): boolean {
    if (x + width > flightBar.width - this.edgeSpacing || y + height > flightBar.depth - this.edgeSpacing) {
      return false;
    }

    for (const existing of placed) {
      if (this.rectanglesOverlap(
        x - this.spacing, y - this.spacing, width + 2 * this.spacing, height + 2 * this.spacing,
        existing.x, existing.y, existing.width, existing.height
      )) {
        return false;
      }
    }

    return true;
  }

  // Check if two rectangles overlap
  private rectanglesOverlap(x1: number, y1: number, w1: number, h1: number, 
                           x2: number, y2: number, w2: number, h2: number): boolean {
    return !(x1 >= x2 + w2 || x2 >= x1 + w1 || y1 >= y2 + h2 || y2 >= y1 + h1);
  }

  // Optimize layout using local search
  private optimizeLayout(flightBar: FlightBar, components: SchedulerComponent[], initialResult: FlightBarResult): FlightBarResult {
    let bestResult = initialResult;
    let bestEfficiency = initialResult.efficiency;

    const strategies = [
      (a: SchedulerComponent, b: SchedulerComponent) => (b.w * b.d) - (a.w * a.d),
      (a: SchedulerComponent, b: SchedulerComponent) => Math.max(b.w, b.d) - Math.max(a.w, a.d),
    ];

    for (const strategy of strategies) {
      const sortedComponents = this.sortComponentsByPriority([...components].sort(strategy));
      const result = this.bottomLeftFill(flightBar, sortedComponents);
      
      if (result.efficiency > bestEfficiency) {
        bestResult = result;
        bestEfficiency = result.efficiency;
      }
    }

    return bestResult;
  }

  // Calculate free spaces in the flight bar
  private calculateFreeSpaces(flightBar: FlightBar, placed: PlacedSchedulerComponent[]): FreeSpace[] {
    const freeSpaces: FreeSpace[] = [];
    const gridSize = 50;

    for (let y = this.edgeSpacing; y < flightBar.depth - this.edgeSpacing; y += gridSize) {
      for (let x = this.edgeSpacing; x < flightBar.width - this.edgeSpacing; x += gridSize) {
        const maxWidth = this.findMaxWidthAt(x, y, flightBar, placed);
        const maxHeight = this.findMaxHeightAt(x, y, flightBar, placed);
        
        if (maxWidth >= 100 && maxHeight >= 100) {
          freeSpaces.push({
            x,
            y,
            width: maxWidth,
            height: maxHeight,
            area: maxWidth * maxHeight
          });
        }
      }
    }

    return this.mergeFreeSpaces(freeSpaces);
  }

  private findMaxWidthAt(x: number, y: number, flightBar: FlightBar, placed: PlacedSchedulerComponent[]): number {
    let maxWidth = flightBar.width - x - this.edgeSpacing;
    
    for (const comp of placed) {
      if (this.rectanglesOverlap(x, y, maxWidth, 1, 
          comp.x - this.spacing, comp.y - this.spacing, 
          comp.width + 2 * this.spacing, comp.height + 2 * this.spacing)) {
        maxWidth = Math.min(maxWidth, comp.x - this.spacing - x);
      }
    }
    
    return Math.max(0, maxWidth);
  }

  private findMaxHeightAt(x: number, y: number, flightBar: FlightBar, placed: PlacedSchedulerComponent[]): number {
    let maxHeight = flightBar.depth - y - this.edgeSpacing;
    
    for (const comp of placed) {
      if (this.rectanglesOverlap(x, y, 1, maxHeight,
          comp.x - this.spacing, comp.y - this.spacing,
          comp.width + 2 * this.spacing, comp.height + 2 * this.spacing)) {
        maxHeight = Math.min(maxHeight, comp.y - this.spacing - y);
      }
    }
    
    return Math.max(0, maxHeight);
  }

  private mergeFreeSpaces(spaces: FreeSpace[]): FreeSpace[] {
    return spaces.sort((a, b) => b.area - a.area).slice(0, 10);
  }

  private findRecommendations(allComponents: SchedulerComponent[], freeSpaces: FreeSpace[], placed: PlacedSchedulerComponent[]): SchedulerComponent[] {
    const placedIds = new Set(placed.map(p => p.id.split('_')[0]));
    const availableComponents = allComponents.filter(comp => !placedIds.has(comp.id));
    const recommendations: SchedulerComponent[] = [];

    for (const space of freeSpaces.slice(0, 5)) {
      for (const component of availableComponents) {
        if ((component.w <= space.width && component.d <= space.height) ||
            (this.allowRotation && component.d <= space.width && component.w <= space.height)) {
          if (!recommendations.find(r => r.id === component.id)) {
            recommendations.push(component);
          }
        }
      }
    }

    return recommendations.slice(0, 5);
  }
}
