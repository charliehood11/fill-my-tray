import { Component, Tray, PlacedComponent, FreeSpace, PackingResult, TrayResult, PackingOptions } from '../types/packing';

interface SingleTrayResult {
  tray: Tray;
  placedComponents: PlacedComponent[];
  totalArea: number;
  usedArea: number;
  efficiency: number;
}

export class TrayPackingOptimizer {
  private spacing: number;
  private edgeSpacing: number;
  private allowRotation: boolean;
  private optimizationLevel: string;
  private packingMode: 'precise' | 'grid';
  private gridColumns: number;
  private gridRows: number;

  constructor(options: PackingOptions) {
    this.spacing = options.spacing;
    this.edgeSpacing = options.edgeSpacing;
    this.allowRotation = options.allowRotation;
    this.optimizationLevel = options.optimizationLevel;
    this.packingMode = options.packingMode || 'precise';
    this.gridColumns = options.gridColumns || 12;
    this.gridRows = options.gridRows || 5;
  }

  // Main packing function - packs across multiple trays
  packTrays(tray: Tray, components: Component[]): PackingResult {
    const expandedComponents = this.expandComponentsByQuantity(components);
    const sortedComponents = this.sortComponentsByPriority(expandedComponents);

    if (this.packingMode === 'grid') {
      return this.gridPack(tray, sortedComponents);
    }

    let remaining = [...sortedComponents];
    const trayResults: TrayResult[] = [];
    let trayNumber = 1;

    while (remaining.length > 0) {
      const singleResult = this.packSingleTray(tray, remaining);
      
      if (singleResult.placedComponents.length === 0) break;

      const freeSpaces = this.calculateFreeSpaces(tray, singleResult.placedComponents);

      trayResults.push({
        tray: { ...tray, id: `${tray.id}_${trayNumber}` },
        trayNumber,
        placedComponents: singleResult.placedComponents,
        totalArea: singleResult.totalArea,
        usedArea: singleResult.usedArea,
        efficiency: singleResult.efficiency,
        remainingSpace: freeSpaces,
      });

      const placedIds = new Set(singleResult.placedComponents.map(p => p.id));
      remaining = remaining.filter(c => !placedIds.has(c.id));
      trayNumber++;
    }

    const totalPlaced = trayResults.reduce((sum, r) => sum + r.placedComponents.length, 0);
    const avgEfficiency = trayResults.length > 0
      ? trayResults.reduce((sum, r) => sum + r.efficiency, 0) / trayResults.length
      : 0;

    const recommendations = this.findRecommendations(components, trayResults.flatMap(r => r.remainingSpace), trayResults.flatMap(r => r.placedComponents));

    return {
      trayResults,
      unplacedComponents: remaining,
      totalTraysUsed: trayResults.length,
      totalComponentsPlaced: totalPlaced,
      averageEfficiency: avgEfficiency,
      recommendations,
    };
  }

  // Grid-based packing: 12 columns × 5 rows, components span cells, no overlap
  private gridPack(tray: Tray, components: Component[]): PackingResult {
    const cols = this.gridColumns;
    const rows = this.gridRows;
    const cellW = tray.width / cols;
    const cellH = tray.depth / rows;

    let remaining = [...components];
    const trayResults: TrayResult[] = [];
    let trayNumber = 1;

    while (remaining.length > 0) {
      // Track occupied cells as a flat boolean array
      const occupied = new Array(cols * rows).fill(false);
      const placedComponents: PlacedComponent[] = [];
      const stillRemaining: Component[] = [];

      for (const component of remaining) {
        // Determine how many cells this component spans
        const spanCols = Math.ceil(component.w / cellW);
        const spanRows = Math.ceil(component.d / cellH);

        // Try rotated orientation too
        let placed = false;
        const orientations: { w: number; h: number; sCols: number; sRows: number; rot: 0 | 90 }[] = [
          { w: component.w, h: component.d, sCols: spanCols, sRows: spanRows, rot: 0 },
        ];
        if (this.allowRotation) {
          const rCols = Math.ceil(component.d / cellW);
          const rRows = Math.ceil(component.w / cellH);
          orientations.push({ w: component.d, h: component.w, sCols: rCols, sRows: rRows, rot: 90 });
        }

        for (const orient of orientations) {
          if (placed) break;
          if (orient.sCols > cols || orient.sRows > rows) continue;

          // Scan cells top-left to bottom-right
          for (let r = 0; r <= rows - orient.sRows; r++) {
            if (placed) break;
            for (let c = 0; c <= cols - orient.sCols; c++) {
              // Check if all cells in the span are free
              let canPlace = true;
              for (let dr = 0; dr < orient.sRows && canPlace; dr++) {
                for (let dc = 0; dc < orient.sCols && canPlace; dc++) {
                  if (occupied[(r + dr) * cols + (c + dc)]) {
                    canPlace = false;
                  }
                }
              }

              if (canPlace) {
                // Mark cells as occupied
                for (let dr = 0; dr < orient.sRows; dr++) {
                  for (let dc = 0; dc < orient.sCols; dc++) {
                    occupied[(r + dr) * cols + (c + dc)] = true;
                  }
                }

                placedComponents.push({
                  id: component.id,
                  w: component.w,
                  d: component.d,
                  name: component.name,
                  priority: component.priority,
                  x: c * cellW,
                  y: r * cellH,
                  width: orient.w,
                  height: orient.h,
                  rotation: orient.rot,
                });
                placed = true;
                break; // Exit column loop once component is placed
              }
            }
          }
        }

        if (!placed) {
          stillRemaining.push(component);
        }
      }

      if (placedComponents.length === 0) break; // Nothing fits

      const totalArea = tray.width * tray.depth;
      const usedArea = placedComponents.reduce((sum, c) => sum + c.width * c.height, 0);

      trayResults.push({
        tray: { ...tray, id: `${tray.id}_${trayNumber}` },
        trayNumber,
        placedComponents,
        totalArea,
        usedArea,
        efficiency: (usedArea / totalArea) * 100,
        remainingSpace: [],
      });

      remaining = stillRemaining;
      trayNumber++;
    }

    const totalPlaced = trayResults.reduce((sum, r) => sum + r.placedComponents.length, 0);
    const avgEfficiency = trayResults.length > 0
      ? trayResults.reduce((sum, r) => sum + r.efficiency, 0) / trayResults.length
      : 0;

    return {
      trayResults,
      unplacedComponents: remaining,
      totalTraysUsed: trayResults.length,
      totalComponentsPlaced: totalPlaced,
      averageEfficiency: avgEfficiency,
      recommendations: [],
    };
  }

  // Legacy single-tray method (kept for compatibility)
  packTray(tray: Tray, components: Component[]): PackingResult {
    return this.packTrays(tray, components);
  }

  private expandComponentsByQuantity(components: Component[]): Component[] {
    const expanded: Component[] = [];
    components.forEach(component => {
      // Ensure quantity is a valid positive number, default to 1
      const quantity = Math.max(1, Number(component.quantity) || 1);
      for (let i = 0; i < quantity; i++) {
        expanded.push({ ...component, id: `${component.id}_${i + 1}`, quantity: 1 });
      }
    });
    return expanded;
  }

  private sortComponentsByPriority(components: Component[]): Component[] {
    const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    return [...components].sort((a, b) => {
      const aPriority = priorityOrder[a.priority || 'medium'];
      const bPriority = priorityOrder[b.priority || 'medium'];
      if (aPriority !== bPriority) return bPriority - aPriority;
      return (b.w * b.d) - (a.w * a.d);
    });
  }

  private packSingleTray(tray: Tray, components: Component[]): SingleTrayResult {
    let bestResult = this.bottomLeftFill(tray, components);
    
    if (this.optimizationLevel !== 'fast') {
      bestResult = this.optimizeLayout(tray, components, bestResult);
    }

    return bestResult;
  }

  private bottomLeftFill(tray: Tray, components: Component[]): SingleTrayResult {
    const placedComponents: PlacedComponent[] = [];
    for (const component of components) {
      const placement = this.findBestPosition(tray, component, placedComponents);
      if (placement) placedComponents.push(placement);
    }
    const usedArea = placedComponents.reduce((sum, comp) => sum + (comp.width * comp.height), 0);
    return {
      tray,
      placedComponents,
      totalArea: tray.width * tray.depth,
      usedArea,
      efficiency: (usedArea / (tray.width * tray.depth)) * 100
    };
  }

  private findBestPosition(tray: Tray, component: Component, placed: PlacedComponent[]): PlacedComponent | null {
    const orientations = this.allowRotation ? 
      [
        { width: component.w, height: component.d, rotation: 0 as const },
        { width: component.d, height: component.w, rotation: 90 as const }
      ] : 
      [{ width: component.w, height: component.d, rotation: 0 as const }];

    let bestPosition: PlacedComponent | null = null;
    let bestScore = Infinity;

    for (const orientation of orientations) {
      const maxX = tray.width - orientation.width - this.edgeSpacing;
      const maxY = tray.depth - orientation.height - this.edgeSpacing;
      
      for (let y = this.edgeSpacing; y <= maxY; y += 10) {
        for (let x = this.edgeSpacing; x <= maxX; x += 10) {
          if (this.canPlaceAt(x, y, orientation.width, orientation.height, tray, placed)) {
            const score = y * 1000 + x;
            if (score < bestScore) {
              bestScore = score;
              bestPosition = {
                id: component.id, w: component.w, d: component.d,
                name: component.name, priority: component.priority,
                x, y, width: orientation.width, height: orientation.height,
                rotation: orientation.rotation
              };
            }
          }
        }
      }
    }
    return bestPosition;
  }

  private canPlaceAt(x: number, y: number, width: number, height: number, tray: Tray, placed: PlacedComponent[]): boolean {
    if (x + width > tray.width - this.edgeSpacing || y + height > tray.depth - this.edgeSpacing) return false;
    for (const existing of placed) {
      if (this.rectanglesOverlap(
        x - this.spacing, y - this.spacing, width + 2 * this.spacing, height + 2 * this.spacing,
        existing.x, existing.y, existing.width, existing.height
      )) return false;
    }
    return true;
  }

  private rectanglesOverlap(x1: number, y1: number, w1: number, h1: number, 
                           x2: number, y2: number, w2: number, h2: number): boolean {
    return !(x1 >= x2 + w2 || x2 >= x1 + w1 || y1 >= y2 + h2 || y2 >= y1 + h1);
  }

  private optimizeLayout(tray: Tray, components: Component[], initialResult: SingleTrayResult): SingleTrayResult {
    let bestResult = initialResult;
    let bestEfficiency = initialResult.efficiency;
    const strategies = [
      (a: Component, b: Component) => (b.w * b.d) - (a.w * a.d),
      (a: Component, b: Component) => Math.max(b.w, b.d) - Math.max(a.w, a.d),
    ];
    for (const strategy of strategies) {
      const sortedComponents = this.sortComponentsByPriority([...components].sort(strategy));
      const result = this.bottomLeftFill(tray, sortedComponents);
      if (result.efficiency > bestEfficiency) {
        bestResult = result;
        bestEfficiency = result.efficiency;
      }
    }
    return bestResult;
  }

  private calculateFreeSpaces(tray: Tray, placed: PlacedComponent[]): FreeSpace[] {
    const freeSpaces: FreeSpace[] = [];
    const gridSize = 50;
    for (let y = this.edgeSpacing; y < tray.depth - this.edgeSpacing; y += gridSize) {
      for (let x = this.edgeSpacing; x < tray.width - this.edgeSpacing; x += gridSize) {
        const maxWidth = this.findMaxWidthAt(x, y, tray, placed);
        const maxHeight = this.findMaxHeightAt(x, y, tray, placed);
        if (maxWidth >= 100 && maxHeight >= 100) {
          freeSpaces.push({ x, y, width: maxWidth, height: maxHeight, area: maxWidth * maxHeight });
        }
      }
    }
    return this.mergeFreeSpaces(freeSpaces);
  }

  private findMaxWidthAt(x: number, y: number, tray: Tray, placed: PlacedComponent[]): number {
    let maxWidth = tray.width - x - this.edgeSpacing;
    for (const comp of placed) {
      if (this.rectanglesOverlap(x, y, maxWidth, 1, comp.x - this.spacing, comp.y - this.spacing, comp.width + 2 * this.spacing, comp.height + 2 * this.spacing)) {
        maxWidth = Math.min(maxWidth, comp.x - this.spacing - x);
      }
    }
    return Math.max(0, maxWidth);
  }

  private findMaxHeightAt(x: number, y: number, tray: Tray, placed: PlacedComponent[]): number {
    let maxHeight = tray.depth - y - this.edgeSpacing;
    for (const comp of placed) {
      if (this.rectanglesOverlap(x, y, 1, maxHeight, comp.x - this.spacing, comp.y - this.spacing, comp.width + 2 * this.spacing, comp.height + 2 * this.spacing)) {
        maxHeight = Math.min(maxHeight, comp.y - this.spacing - y);
      }
    }
    return Math.max(0, maxHeight);
  }

  private mergeFreeSpaces(spaces: FreeSpace[]): FreeSpace[] {
    return spaces.sort((a, b) => b.area - a.area).slice(0, 10);
  }

  private findRecommendations(allComponents: Component[], freeSpaces: FreeSpace[], placed: PlacedComponent[]): Component[] {
    const placedIds = new Set(placed.map(p => p.id.split('_')[0]));
    const availableComponents = allComponents.filter(comp => !placedIds.has(comp.id));
    const recommendations: Component[] = [];
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
