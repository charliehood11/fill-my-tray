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
  private packingMode: 'precise' | 'grid' | 'diagonal' | 'shelf';
  private gridColumns: number;
  private gridRows: number;
  private randomize: boolean;
  private shelfGridFill: boolean;
  private diagonalMinPerBar: number;
  private diagonalMaxPerBar: number;

  constructor(options: PackingOptions) {
    this.spacing = options.spacing;
    this.edgeSpacing = options.edgeSpacing;
    this.allowRotation = options.allowRotation;
    this.optimizationLevel = options.optimizationLevel;
    this.packingMode = options.packingMode || 'precise';
    this.gridColumns = options.gridColumns || 12;
    this.gridRows = options.gridRows || 5;
    this.randomize = options.randomize ?? false;
    this.shelfGridFill = options.shelfGridFill ?? false;
    this.diagonalMinPerBar = options.diagonalMinPerBar ?? 1;
    this.diagonalMaxPerBar = options.diagonalMaxPerBar ?? 4;
  }

  // Main packing function
  packTrays(tray: Tray, components: Component[]): PackingResult {
    if (this.packingMode === 'grid') {
      // Grid mode: batch-aware flight-bar packing
      return this.gridPackBatches(tray, components);
    }

    if (this.packingMode === 'diagonal') {
      // Diagonal mode: 45° placement, randomisable, min–max per flight bar
      return this.diagonalPack(tray, components);
    }

    if (this.packingMode === 'shelf') {
      // Shelf / Batch-Mix mode: shuffled batch order, tight shelf packing
      return this.shelfPack(tray, components);
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
        // Apply a 1-cell gap if we're mid-column (not at the start of a fresh column)
        const startRow = currentRow > 0 ? currentRow + 1 : 0;
        const result = this.tryPlaceBatch(batch.size, currentCol, startRow, cols, rows);

        if (result === null) break; // Batch doesn't fit on the remaining columns

        const { segments, nextRow, nextCol } = result;
        const label = `${batch.compName || batch.compId} (B${batch.batchIdx + 1})`;

        // Place each individual part as its own cell
        let partIdx = 0;
        for (let s = 0; s < segments.length; s++) {
          const seg = segments[s];
          for (let p = 0; p < seg.count; p++) {
            placedComponents.push({
              id:       `${batch.compId}_b${batch.batchIdx}_p${partIdx++}`,
              w:        batch.w,
              d:        batch.d,
              name:     label,
              priority: batch.priority,
              x:        seg.col * cellW,
              y:        (seg.row + p) * cellH,
              width:    cellW,
              height:   cellH,
              rotation: 0,
            });
          }
        }

        batchEnd = b + 1;
        currentCol = nextCol;
        currentRow = nextRow;
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

  // ─── Shelf / Batch-Mix Packing ──────────────────────────────────────────────

  /**
   * Tight shelf-packing with randomised batch order.
   *
   * Rules:
   *  • All batches from all components are collected and, if randomize is on,
   *    shuffled so different part types are interleaved across trays.
   *  • Parts are placed left-to-right using their actual w×d dimensions —
   *    no fixed grid cells, no empty cell padding.
   *  • A new shelf starts whenever the next part would exceed the tray width.
   *    The shelf height equals the tallest part placed in it.
   *  • If allowRotation is true each part is also tried rotated 90° and the
   *    orientation that wastes less horizontal space is preferred.
   */
  private shelfPack(tray: Tray, components: Component[]): PackingResult {
    // 1. Build flat list of batches
    interface ShelfBatch {
      compId: string;
      compName?: string;
      priority?: Component['priority'];
      batchIdx: number;
      batchSize: number;
      w: number;
      d: number;
    }

    const batches: ShelfBatch[] = [];
    for (const comp of components) {
      const numBatches = Math.max(1, Math.round(Number(comp.numBatches) || 1));
      const batchSize  = Math.max(1, Math.round(Number(comp.batchSize)  || 1));
      for (let b = 0; b < numBatches; b++) {
        batches.push({
          compId:    comp.id,
          compName:  comp.name,
          priority:  comp.priority,
          batchIdx:  b,
          batchSize,
          w:         comp.w,
          d:         comp.d,
        });
      }
    }

    // 2. Shuffle batch order if randomise is on
    if (this.randomize) {
      for (let i = batches.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [batches[i], batches[j]] = [batches[j], batches[i]];
      }
    }

    // 3. Expand into individual parts while keeping batch order
    interface ShelfPart {
      id: string;
      name: string;
      priority?: Component['priority'];
      w: number;
      d: number;
    }

    const parts: ShelfPart[] = [];
    for (const batch of batches) {
      const label = `${batch.compName || batch.compId} (B${batch.batchIdx + 1})`;
      for (let p = 0; p < batch.batchSize; p++) {
        parts.push({
          id:       `${batch.compId}_b${batch.batchIdx}_p${p}`,
          name:     label,
          priority: batch.priority,
          w:        batch.w,
          d:        batch.d,
        });
      }
    }

    // 4. Shelf-pack: place parts tightly, left-to-right, new shelf when full
    const sp = this.spacing;
    const ep = this.edgeSpacing;

    const trayResults: TrayResult[] = [];
    const skipped: ShelfPart[] = [];
    let partIdx  = 0;
    let trayNumber = 1;

    while (partIdx < parts.length) {
      const placedComponents: PlacedComponent[] = [];
      const startIdx = partIdx;

      if (this.shelfGridFill) {
        // ── Grid-fill variant ──────────────────────────────────────────────
        // Lay a grid of cells over the tray. Place each part at the first
        // unoccupied cell. The part uses its actual dimensions so it may
        // span several cells; those neighbouring cells are marked occupied
        // and skipped for future parts.
        const cols    = this.gridColumns;
        const rows    = this.gridRows;
        const cellW   = (tray.width  - 2 * ep) / cols;
        const cellH   = (tray.depth  - 2 * ep) / rows;
        const occupied = new Set<number>(); // cell index = row*cols + col

        let cellIdx = 0; // scan pointer

        while (partIdx < parts.length && cellIdx < cols * rows) {
          // Advance to the next free cell
          while (cellIdx < cols * rows && occupied.has(cellIdx)) cellIdx++;
          if (cellIdx >= cols * rows) break;

          const col = cellIdx % cols;
          const row = Math.floor(cellIdx / cols);
          const x   = ep + col * cellW;
          const y   = ep + row * cellH;

          const part = parts[partIdx];
          let pw = part.w, pd = part.d, rot: number = 0;
          if (this.allowRotation) {
            const usableW = tray.width  - 2 * ep;
            const usableD = tray.depth  - 2 * ep;
            const fitsNorm = part.w <= usableW && part.d <= usableD;
            const fitsRot  = part.d <= usableW && part.w <= usableD;
            // Rotate if: only rotated orientation fits, OR both fit but part is taller than wide
            if ((!fitsNorm && fitsRot) || (fitsNorm && fitsRot && part.d > part.w)) {
              pw = part.d; pd = part.w; rot = 90;
            }
          }

          // Skip permanently if larger than the whole tray in any orientation
          if (pw > tray.width - 2 * ep || pd > tray.depth - 2 * ep) {
            skipped.push(part);
            partIdx++;
            continue;
          }

          // Place the part at (x, y) — overflow into neighbours is intentional
          placedComponents.push({
            id: part.id, name: part.name, priority: part.priority,
            w: part.w, d: part.d, x, y, width: pw, height: pd, rotation: rot,
          });

          // Mark every cell whose top-left corner falls inside the part's footprint
          const colSpan = Math.ceil(pw / cellW);
          const rowSpan = Math.ceil(pd / cellH);
          for (let r = row; r < Math.min(row + rowSpan, rows); r++) {
            for (let c = col; c < Math.min(col + colSpan, cols); c++) {
              occupied.add(r * cols + c);
            }
          }

          partIdx++;
          cellIdx++; // move past the cell we just used
        }
      } else {
        // ── Shelf variant (default) ────────────────────────────────────────
        let shelfX = ep;
        let shelfY = ep;
        let shelfH = 0;

        while (partIdx < parts.length) {
          const part = parts[partIdx];

          let pw = part.w, pd = part.d, rot: number = 0;
          if (this.allowRotation) {
            const remainingX = tray.width - ep - shelfX;
            const fitNormal  = pw <= remainingX;
            const fitRotated = pd <= remainingX;
            if (!fitNormal && fitRotated) {
              [pw, pd] = [pd, pw]; rot = 90;
            } else if (fitNormal && fitRotated && pd < pw) {
              [pw, pd] = [pd, pw]; rot = 90;
            }
          }

          if (pw > tray.width - 2 * ep || pd > tray.depth - 2 * ep) {
            skipped.push(part); partIdx++; continue;
          }

          if (shelfX + pw > tray.width - ep) {
            shelfY += shelfH + sp; shelfX = ep; shelfH = 0;
          }

          if (shelfY + pd > tray.depth - ep) break;

          placedComponents.push({
            id: part.id, name: part.name, priority: part.priority,
            w: part.w, d: part.d, x: shelfX, y: shelfY,
            width: pw, height: pd, rotation: rot,
          });

          shelfH  = Math.max(shelfH, pd);
          shelfX += pw + sp;
          partIdx++;
        }
      }

      if (placedComponents.length === 0 && partIdx === startIdx) break; // safety

      const totalArea = tray.width * tray.depth;
      const usedArea  = placedComponents.reduce((sum, c) => sum + c.w * c.d, 0);

      trayResults.push({
        tray:           { ...tray, id: `${tray.id}_${trayNumber}` },
        trayNumber,
        placedComponents,
        totalArea,
        usedArea,
        efficiency:     (usedArea / totalArea) * 100,
        remainingSpace: [],
      });

      trayNumber++;
    }

    const avgEfficiency = trayResults.length > 0
      ? trayResults.reduce((sum, r) => sum + r.efficiency, 0) / trayResults.length
      : 0;

    return {
      trayResults,
      unplacedComponents: skipped.map(p => ({
        id:        p.id,
        w:         p.w,
        d:         p.d,
        name:      p.name,
        numBatches: 1,
        batchSize:  1,
        priority:  p.priority,
      })),
      totalTraysUsed:        trayResults.length,
      totalComponentsPlaced: parts.length - skipped.length,
      averageEfficiency:     avgEfficiency,
      recommendations:       [],
    };
  }

  // ─── Diagonal (45°) Packing ─────────────────────────────────────────────────

  /**
   * Pack individual parts at 45° in horizontal flight bars.
   *
   * Rules:
   *  • Each part is oriented at 45°; its bounding box becomes a square of
   *    side = (longSide + shortSide) / √2.  The long dimension is kept in
   *    the left-right direction before rotation.
   *  • Parts are grouped into flight bars (rows).  Each bar gets a random
   *    number of parts between diagonalMinPerBar and diagonalMaxPerBar.
   *  • When randomize is true, part order is shuffled and bar count is random;
   *    otherwise parts keep their original order and bars use the maximum count.
   *  • Bars are placed top-to-bottom in the tray.
   */
  private diagonalPack(tray: Tray, components: Component[]): PackingResult {

    // Candidate angles from vertical (minimum 5° — parts must never be vertical)
    // At angle θ from vertical, for a w×d rectangle (w = long side):
    //   bboxW = w·sin(θ) + d·cos(θ)   ← horizontal footprint in the flight bar
    //   bboxH = w·cos(θ) + d·sin(θ)   ← bar height contribution
    // Angles are tried in order; the one that fits the most parts wins.
    // Goes beyond 45° only when needed for large parts that won't fit otherwise.
    const CANDIDATE_ANGLES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85];

    const bbox = (w: number, d: number, thetaDeg: number) => {
      const r = thetaDeg * Math.PI / 180;
      return {
        bboxW: w * Math.sin(r) + d * Math.cos(r),
        bboxH: w * Math.cos(r) + d * Math.sin(r),
      };
    };

    // Expand every component's batches into individual parts
    interface DiagPart {
      id: string;
      name: string;
      w: number;  // long side (ensured >= d)
      d: number;  // short side
      priority?: Component['priority'];
    }

    const parts: DiagPart[] = [];
    for (const comp of components) {
      const numBatches = Math.max(1, Math.round(Number(comp.numBatches) || 1));
      const batchSize  = Math.max(1, Math.round(Number(comp.batchSize)  || 1));
      const label      = comp.name || comp.id;
      const longSide  = Math.max(comp.w, comp.d);
      const shortSide = Math.min(comp.w, comp.d);
      for (let b = 0; b < numBatches; b++) {
        for (let p = 0; p < batchSize; p++) {
          parts.push({
            id:       `${comp.id}_b${b}_p${p}`,
            name:     label,
            w:        longSide,
            d:        shortSide,
            priority: comp.priority,
          });
        }
      }
    }

    // Fisher-Yates shuffle when randomise is on
    if (this.randomize) {
      for (let i = parts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [parts[i], parts[j]] = [parts[j], parts[i]];
      }
    }

    const minPer = Math.max(1, this.diagonalMinPerBar);
    const maxPer = Math.max(minPer, this.diagonalMaxPerBar);

    // For a given set of parts and starting position, find the angle that fits
    // the most parts in a single flight bar. Tie-breaks on smallest bar height.
    const findBestBar = (
      fromIdx: number,
      wantCount: number,
      currentY: number,
    ): { count: number; angleDeg: number; barH: number } => {
      let bestCount = 0;
      let bestAngle = 45;
      let bestBarH  = Infinity;

      for (const angleDeg of CANDIDATE_ANGLES) {
        let x    = 0;
        let barH = 0;
        let cnt  = 0;

        for (let i = fromIdx; i < Math.min(fromIdx + wantCount, parts.length); i++) {
          const p = parts[i];
          const { bboxW, bboxH } = bbox(p.w, p.d, angleDeg);
          const newBarH = Math.max(barH, bboxH);

          // Stop if this part would exceed tray width or push bar out of tray depth
          if (x + bboxW > tray.width)         break;
          if (currentY + newBarH > tray.depth) break;

          x    += bboxW;
          barH  = newBarH;
          cnt++;
        }

        if (cnt > bestCount || (cnt === bestCount && barH < bestBarH && cnt > 0)) {
          bestCount = cnt;
          bestAngle = angleDeg;
          bestBarH  = barH;
        }
      }

      return { count: bestCount, angleDeg: bestAngle, barH: bestBarH };
    };

    const trayResults: TrayResult[] = [];
    const skippedParts: DiagPart[] = [];   // parts genuinely too large for the tray
    let partStart = 0;
    let trayNumber = 1;

    while (partStart < parts.length) {
      const placedComponents: PlacedComponent[] = [];
      let currentY = 0;
      let partEnd  = partStart;
      let idx      = partStart;

      while (idx < parts.length) {
        // Always try to fill up to the maximum per bar.
        // Randomise only affects part ORDER (handled by the Fisher-Yates shuffle above).
        const remaining = parts.length - idx;
        const wantCount = Math.min(maxPer, remaining);

        // findBestBar already scans every candidate angle and returns the true
        // best (angle, count) pair — no outer retry loop needed.
        const best = findBestBar(idx, wantCount, currentY);

        // Nothing fits on this tray at all — start a fresh tray
        if (best.count === 0) break;

        // Build the placed parts using the chosen angle
        const tempPlaced: PlacedComponent[] = [];
        let x = 0;

        for (let i = idx; i < idx + best.count; i++) {
          const p = parts[i];
          const { bboxW } = bbox(p.w, p.d, best.angleDeg);
          // SVG rotation: 90° - angleDeg  (5°from-vertical → svgRot 85°, 45° → svgRot 45°)
          const svgRotation = 90 - best.angleDeg;
          tempPlaced.push({
            id:       p.id,
            name:     p.name,
            w:        p.w,
            d:        p.d,
            priority: p.priority,
            x,
            y:        currentY,
            width:    bboxW,
            height:   best.barH,
            rotation: svgRotation,
          });
          x += bboxW;
        }

        placedComponents.push(...tempPlaced);
        idx      += best.count;
        partEnd   = idx;
        currentY += best.barH;
      }

      if (partEnd === partStart) {
        // This part cannot fit on any tray — record it as unplaceable and move on
        skippedParts.push(parts[partStart]);
        partStart++;
        continue;
      }

      const totalArea = tray.width * tray.depth;
      // Use actual part area (w × d) for efficiency, not bounding box
      const usedArea  = placedComponents.reduce((sum, c) => sum + c.w * c.d, 0);

      trayResults.push({
        tray: { ...tray, id: `${tray.id}_${trayNumber}` },
        trayNumber,
        placedComponents,
        totalArea,
        usedArea,
        efficiency: (usedArea / totalArea) * 100,
        remainingSpace: [],
      });

      partStart = partEnd;
      trayNumber++;
    }

    const unplacedComponents: Component[] = skippedParts.map(p => ({
      id: p.id,
      w:  p.w,
      d:  p.d,
      name: p.name,
    }));

    const totalPlaced = trayResults.reduce((sum, r) => sum + r.placedComponents.length, 0);
    const avgEfficiency = trayResults.length > 0
      ? trayResults.reduce((sum, r) => sum + r.efficiency, 0) / trayResults.length
      : 0;

    return {
      trayResults,
      unplacedComponents,
      totalTraysUsed:        trayResults.length,
      totalComponentsPlaced: totalPlaced,
      averageEfficiency:     avgEfficiency,
      recommendations:       [],
    };
  }

  /**
   * Try to place a single batch of `size` parts starting at (startCol, startRow).
   *
   * Parts are packed VERTICALLY — filling top-to-bottom down a column before
   * moving to the next column. A batch may span multiple columns only when it
   * completely fills the first column it occupies.
   *
   * Returns null if the batch cannot fit on the current tray.
   * Otherwise returns the list of column-segments and the next free position.
   */
  private tryPlaceBatch(
    size: number,
    startCol: number,
    startRow: number,
    cols: number,
    rows: number,
  ): PlacementResult | null {
    let remaining = size;
    let col = startCol;
    let row = startRow;
    const segments: BatchSegment[] = [];

    while (remaining > 0) {
      if (col >= cols) return null; // Reached end of tray (no more columns)

      const availInCol = rows - row;

      if (remaining <= availInCol) {
        // Entire remaining batch fits in the current column
        segments.push({ row, col, count: remaining });
        row += remaining;
        if (row >= rows) {
          // Filled the column exactly — leave a gap column for the next batch
          col += 2;
          row = 0;
        }
        remaining = 0;
      } else if (row === 0) {
        // At the top of a column and batch is larger than the column —
        // fill the whole column and continue directly to the next (same batch, no gap)
        segments.push({ row: 0, col, count: rows });
        remaining -= rows;
        col++;       // no gap: same batch is continuing
        row = 0;
      } else {
        // Mid-column and batch doesn't fit in the remaining slots —
        // skip a gap column and retry at the top of the column after it
        col += 2;
        row = 0;
        // remaining is unchanged; retry at new column top
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
