import { Component, Tray, PlacedComponent, FreeSpace, PackingResult, TrayResult, PackingOptions } from '../types/packing';

interface SingleTrayResult {
  tray: Tray;
  placedComponents: PlacedComponent[];
  totalArea: number;
  usedArea: number;
  efficiency: number;
}

interface BatchItem {
  compId: string;
  compName?: string;
  priority?: Component['priority'];
  batchIdx: number;
  size: number;
  w: number;
  d: number;
}

interface BatchSegment {
  row: number;
  col: number;
  count: number;
}

interface PlacementResult {
  segments: BatchSegment[];
  nextRow: number;
  nextCol: number;
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

  // Main packing function
  packTrays(tray: Tray, components: Component[]): PackingResult {
    if (this.packingMode === 'grid') {
      // Grid mode: batch-aware flight-bar packing
      return this.gridPackBatches(tray, components);
    }

    // Precise mode: expand by numBatches × batchSize and place individually
    const expandedComponents = this.expandComponentsByQuantity(components);
    const sortedComponents = this.sortComponentsByPriority(expandedComponents);

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

  // Legacy single-tray method (kept for compatibility)
  packTray(tray: Tray, components: Component[]): PackingResult {
    return this.packTrays(tray, components);
  }

  // ─── Grid / Flight-Bar Batch Packing ───────────────────────────────────────

  /**
   * Pack components in grid (flight-bar) mode.
   *
   * Rules:
   *  • Each batch occupies consecutive slots on a flight bar (row).
   *  • If a batch does not fit in the remaining slots of the current flight bar
   *    the entire batch moves to the next flight bar.
   *  • A batch MAY span more than one flight bar only if it completely fills
   *    the first flight bar (i.e. it is larger than one row's worth of slots).
   */
  private gridPackBatches(tray: Tray, components: Component[]): PackingResult {
    const cols = this.gridColumns;
    const rows = this.gridRows;
    const cellW = tray.width / cols;
    const cellH = tray.depth / rows;

    // Sort components by priority, then build the flat batch list
    const sorted = this.sortComponentsByPriority([...components]);
    const allBatches: BatchItem[] = [];

    for (const comp of sorted) {
      const numBatches = Math.max(1, Math.round(Number(comp.numBatches) || 1));
      const batchSize  = Math.max(1, Math.round(Number(comp.batchSize)  || 1));
      for (let b = 0; b < numBatches; b++) {
        allBatches.push({
          compId:   comp.id,
          compName: comp.name,
          priority: comp.priority,
          batchIdx: b,
          size:     batchSize,
          w:        comp.w,
          d:        comp.d,
        });
      }
    }

    const trayResults: TrayResult[] = [];
    let batchStart = 0;
    let trayNumber = 1;

    while (batchStart < allBatches.length) {
      const placedComponents: PlacedComponent[] = [];
      let currentRow = 0;
      let currentCol = 0;
      let batchEnd = batchStart;

      for (let b = batchStart; b < allBatches.length; b++) {
        const batch = allBatches[b];
        const result = this.tryPlaceBatch(batch.size, currentRow, currentCol, cols, rows);

        if (result === null) break; // Batch doesn't fit on the remaining rows

        const { segments, nextRow, nextCol } = result;
        const multi = segments.length > 1;
        const label = `${batch.compName || batch.compId} (B${batch.batchIdx + 1})`;

        for (let s = 0; s < segments.length; s++) {
          const seg = segments[s];
          placedComponents.push({
            id:       multi ? `${batch.compId}_b${batch.batchIdx}_r${s}` : `${batch.compId}_b${batch.batchIdx}`,
            w:        batch.w,
            d:        batch.d,
            name:     label,
            priority: batch.priority,
            x:        seg.col * cellW,
            y:        seg.row * cellH,
            width:    seg.count * cellW,
            height:   cellH,
            rotation: 0,
          });
        }

        currentRow = nextRow;
        currentCol = nextCol;
        batchEnd = b + 1;

        // Leave a 1-cell gap between batches on the same flight bar
        if (currentCol > 0) {
          currentCol++;
          if (currentCol >= cols) {
            currentRow++;
            currentCol = 0;
          }
        }
      }

      if (batchEnd === batchStart) {
        // Current batch is too large for the entire tray — mark it unplaced and skip
        batchStart++;
        continue;
      }

      const totalArea = tray.width * tray.depth;
      const usedArea  = placedComponents.reduce((sum, c) => sum + c.width * c.height, 0);

      trayResults.push({
        tray:             { ...tray, id: `${tray.id}_${trayNumber}` },
        trayNumber,
        placedComponents,
        totalArea,
        usedArea,
        efficiency:       (usedArea / totalArea) * 100,
        remainingSpace:   [],
      });

      batchStart = batchEnd;
      trayNumber++;
    }

    // Remaining batches that could not be placed
    const unplacedBatches: Component[] = allBatches.slice(batchStart).map(b => ({
      id:         `${b.compId}_b${b.batchIdx}`,
      w:          b.w,
      d:          b.d,
      name:       b.compName,
      numBatches: 1,
      batchSize:  b.size,
      priority:   b.priority,
    }));

    const batchesPlaced  = batchStart;
    const avgEfficiency  = trayResults.length > 0
      ? trayResults.reduce((sum, r) => sum + r.efficiency, 0) / trayResults.length
      : 0;

    return {
      trayResults,
      unplacedComponents:    unplacedBatches,
      totalTraysUsed:        trayResults.length,
      totalComponentsPlaced: batchesPlaced,
      averageEfficiency:     avgEfficiency,
      recommendations:       [],
    };
  }

  /**
   * Try to place a single batch of `size` parts starting at (startRow, startCol).
   *
   * Returns null if the batch cannot fit on the current tray.
   * Otherwise returns the list of row-segments and the next free position.
   */
  private tryPlaceBatch(
    size: number,
    startRow: number,
    startCol: number,
    cols: number,
    rows: number,
  ): PlacementResult | null {
    let remaining = size;
    let row = startRow;
    let col = startCol;
    const segments: BatchSegment[] = [];

    while (remaining > 0) {
      if (row >= rows) return null; // Reached end of tray

      const availInRow = cols - col;

      if (remaining <= availInRow) {
        // Entire remaining batch fits in this row
        segments.push({ row, col, count: remaining });
        col += remaining;
        if (col >= cols) { row++; col = 0; }
        remaining = 0;
      } else if (col === 0) {
        // At the start of a row and batch is larger than a full row —
        // fill the whole row and continue to the next
        segments.push({ row, col: 0, count: cols });
        remaining -= cols;
        row++;
        col = 0;
      } else {
        // Mid-row and batch doesn't fit in the remaining slots —
        // move the entire batch to the start of the next flight bar
        row++;
        col = 0;
        // remaining is unchanged; retry at new row start
      }
    }

    return { segments, nextRow: row, nextCol: col };
  }

  // ─── Precise Packing (unchanged) ───────────────────────────────────────────

  private expandComponentsByQuantity(components: Component[]): Component[] {
    const expanded: Component[] = [];
    components.forEach(component => {
      const numBatches = Math.max(1, Number(component.numBatches) || 1);
      const batchSize  = Math.max(1, Number(component.batchSize)  || 1);
      const totalQty   = numBatches * batchSize;
      for (let i = 0; i < totalQty; i++) {
        expanded.push({ ...component, id: `${component.id}_${i + 1}`, numBatches: 1, batchSize: 1 });
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
