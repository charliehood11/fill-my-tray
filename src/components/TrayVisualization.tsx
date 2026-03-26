import React from 'react';
import { TrayResult } from '../types/packing';

interface TrayVisualizationProps {
  result: TrayResult;
  scale?: number;
  gridColumns?: number;
  gridRows?: number;
  packingMode?: 'precise' | 'grid' | 'diagonal';
}

const TrayVisualization: React.FC<TrayVisualizationProps> = ({
  result,
  scale = 0.2,
  gridColumns,
  gridRows,
  packingMode,
}) => {
  const { tray, placedComponents } = result;

  const scaledTrayWidth = tray.width * scale;
  const scaledTrayDepth = tray.depth * scale;

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical': return '#ef4444';
      case 'high':     return '#f97316';
      case 'medium':   return '#eab308';
      case 'low':      return '#22c55e';
      default:         return '#6b7280';
    }
  };

  const renderGridLines = () => {
    if (!gridColumns || !gridRows) return null;
    const lines = [];
    const cellW = scaledTrayWidth / gridColumns;
    const cellH = scaledTrayDepth / gridRows;

    for (let c = 1; c < gridColumns; c++) {
      lines.push(
        <line key={`col-${c}`} x1={10 + c * cellW} y1={10} x2={10 + c * cellW} y2={10 + scaledTrayDepth}
          stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="4,2" />
      );
    }
    for (let r = 1; r < gridRows; r++) {
      lines.push(
        <line key={`row-${r}`} x1={10} y1={10 + r * cellH} x2={10 + scaledTrayWidth} y2={10 + r * cellH}
          stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="4,2" />
      );
    }
    return lines;
  };

  const renderComponent = (component: TrayResult['placedComponents'][0], index: number) => {
    const color = getPriorityColor(component.priority);
    const label = component.name || component.id.split('_')[0];

    if (component.rotation === 45) {
      // Draw actual rotated diamond: the rect is w×d, rotated 45° around the
      // centre of its bounding box so the long side spans left-to-right.
      const bboxX = component.x * scale + 10;
      const bboxY = component.y * scale + 10;
      const bboxW = component.width  * scale;
      const bboxH = component.height * scale;
      const cx = bboxX + bboxW / 2;
      const cy = bboxY + bboxH / 2;
      const scaledW = component.w * scale;
      const scaledD = component.d * scale;

      return (
        <g key={index}>
          {/* Bounding-box outline (faint guide) */}
          <rect x={bboxX} y={bboxY} width={bboxW} height={bboxH}
            fill="none" stroke={color} strokeWidth="0.5" strokeDasharray="3,2" opacity="0.4" />
          {/* Actual part rotated 45° around its centre */}
          <g transform={`rotate(45, ${cx}, ${cy})`}>
            <rect
              x={cx - scaledW / 2}
              y={cy - scaledD / 2}
              width={scaledW}
              height={scaledD}
              fill={color}
              fillOpacity="0.75"
              stroke={color}
              strokeWidth="1"
              rx="1"
            />
          </g>
          {/* Label stays upright at bounding-box centre */}
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
            className="fill-white font-semibold" fontSize="7" style={{ pointerEvents: 'none' }}>
            {label}
          </text>
          <title>
            {label}{'\n'}Position: ({component.x.toFixed(0)}, {component.y.toFixed(0)})mm
            {'\n'}Size: {component.w}×{component.d}mm @ 45°
            {component.priority ? `\nPriority: ${component.priority}` : ''}
          </title>
        </g>
      );
    }

    // Standard 0° / 90° rendering
    const scaledX = component.x * scale + 10;
    const scaledY = component.y * scale + 10;
    const scaledWidth  = component.width  * scale;
    const scaledHeight = component.height * scale;

    return (
      <g key={index}>
        <rect x={scaledX} y={scaledY} width={scaledWidth} height={scaledHeight}
          fill={color} fillOpacity="0.7" stroke={color} strokeWidth="1" rx="2" />
        <text x={scaledX + scaledWidth / 2} y={scaledY + scaledHeight / 2}
          textAnchor="middle" dominantBaseline="middle"
          className="fill-white font-semibold" fontSize="8">
          {label}
        </text>
        {component.rotation === 90 && (
          <text x={scaledX + scaledWidth - 2} y={scaledY + 8}
            textAnchor="end" className="fill-white font-bold" fontSize="6">↻</text>
        )}
        <title>
          {label}{'\n'}Position: ({component.x}, {component.y})mm
          {'\n'}Size: {component.width}×{component.height}mm
          {component.rotation === 90 ? '\nRotated 90°' : ''}
          {component.priority ? `\nPriority: ${component.priority}` : ''}
        </title>
      </g>
    );
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Scale: 1:{Math.round(1 / scale)} | Tray: {tray.width}×{tray.depth}mm
          {gridColumns && gridRows && ` | Grid: ${gridColumns}×${gridRows}`}
          {packingMode === 'diagonal' && ' | 45° diagonal packing'}
        </p>
      </div>

      <div className="flex justify-center">
        <div className="relative border-2 border-border bg-muted rounded-lg p-2">
          <svg
            width={scaledTrayWidth + 20}
            height={scaledTrayDepth + 20}
            className="bg-background border border-border rounded"
          >
            <rect x={10} y={10} width={scaledTrayWidth} height={scaledTrayDepth}
              fill="none" stroke="#374151" strokeWidth="2" />

            {renderGridLines()}

            <text x={10 + scaledTrayWidth / 2} y={8} textAnchor="middle"
              className="fill-muted-foreground text-xs" fontSize="10">{tray.width}mm</text>
            <text x={6} y={10 + scaledTrayDepth / 2} textAnchor="middle"
              className="fill-muted-foreground text-xs" fontSize="10"
              transform={`rotate(-90, 6, ${10 + scaledTrayDepth / 2})`}>{tray.depth}mm</text>

            {placedComponents.map((component, index) => renderComponent(component, index))}
          </svg>

          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded"></div><span>Critical</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-500 rounded"></div><span>High</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded"></div><span>Medium</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded"></div><span>Low</span></div>
            {packingMode !== 'diagonal' && (
              <div className="flex items-center gap-1"><span>↻ = Rotated 90°</span></div>
            )}
            {packingMode === 'diagonal' && (
              <div className="flex items-center gap-1"><span>◇ = 45° diagonal placement</span></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrayVisualization;
