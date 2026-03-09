import React from 'react';
import { TrayResult } from '../types/packing';

interface TrayVisualizationProps {
  result: TrayResult;
  scale?: number;
}

const TrayVisualization: React.FC<TrayVisualizationProps> = ({ result, scale = 0.2 }) => {
  const { tray, placedComponents } = result;
  
  const scaledTrayWidth = tray.width * scale;
  const scaledTrayDepth = tray.depth * scale;
  
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Scale: 1:{Math.round(1/scale)} | Tray: {tray.width}×{tray.depth}mm
        </p>
      </div>
      
      <div className="flex justify-center">
        <div className="relative border-2 border-gray-400 bg-gray-100 rounded-lg p-2">
          <svg
            width={scaledTrayWidth + 20}
            height={scaledTrayDepth + 20}
            className="bg-white border border-gray-300 rounded"
          >
            <rect x={10} y={10} width={scaledTrayWidth} height={scaledTrayDepth}
              fill="none" stroke="#374151" strokeWidth="2" />
            
            <text x={10 + scaledTrayWidth / 2} y={8} textAnchor="middle"
              className="fill-gray-600 text-xs" fontSize="10">{tray.width}mm</text>
            <text x={6} y={10 + scaledTrayDepth / 2} textAnchor="middle"
              className="fill-gray-600 text-xs" fontSize="10"
              transform={`rotate(-90, 6, ${10 + scaledTrayDepth / 2})`}>{tray.depth}mm</text>
            
            {placedComponents.map((component, index) => {
              const scaledX = component.x * scale + 10;
              const scaledY = component.y * scale + 10;
              const scaledWidth = component.width * scale;
              const scaledHeight = component.height * scale;
              const componentColor = getPriorityColor(component.priority);
              
              return (
                <g key={index}>
                  <rect x={scaledX} y={scaledY} width={scaledWidth} height={scaledHeight}
                    fill={componentColor} fillOpacity="0.7" stroke={componentColor}
                    strokeWidth="1" rx="2" />
                  <text x={scaledX + scaledWidth / 2} y={scaledY + scaledHeight / 2}
                    textAnchor="middle" dominantBaseline="middle"
                    className="fill-white font-semibold" fontSize="8">
                    {component.name || component.id.split('_')[0]}
                  </text>
                  {component.rotation === 90 && (
                    <text x={scaledX + scaledWidth - 2} y={scaledY + 8}
                      textAnchor="end" className="fill-white font-bold" fontSize="6">↻</text>
                  )}
                  <title>
                    {component.name || component.id.split('_')[0]}
                    {'\n'}Position: ({component.x}, {component.y})mm
                    {'\n'}Size: {component.width}×{component.height}mm
                    {component.rotation === 90 ? '\nRotated 90°' : ''}
                    {component.priority ? `\nPriority: ${component.priority}` : ''}
                  </title>
                </g>
              );
            })}
          </svg>
          
          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded"></div><span>Critical</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-500 rounded"></div><span>High</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded"></div><span>Medium</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded"></div><span>Low</span></div>
            <div className="flex items-center gap-1"><span>↻ = Rotated 90°</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrayVisualization;
