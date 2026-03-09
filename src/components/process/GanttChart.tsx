
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GanttTask } from '../../types/processing';

interface GanttChartProps {
  tasks: GanttTask[];
  totalTime: number;
}

const GanttChart: React.FC<GanttChartProps> = ({ tasks, totalTime }) => {
  const flightBars = useMemo(() => {
    const flightBarSet = new Set(tasks.map(task => task.flightBarId));
    return Array.from(flightBarSet).sort();
  }, [tasks]);

  const operations = useMemo(() => {
    const operationSet = new Set(tasks.map(task => task.operation));
    return Array.from(operationSet).sort();
  }, [tasks]);

  // Generate distinct colors for each operation
  const operationColors = useMemo(() => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280', '#84CC16', '#F97316', '#06B6D4'];
    const colorMap: { [operation: string]: string } = {};
    operations.forEach((operation, index) => {
      colorMap[operation] = colors[index % colors.length];
    });
    return colorMap;
  }, [operations]);

  const timeScale = 600; // Height of the chart in pixels
  const columnWidth = 120;
  const headerHeight = 50;

  const getTimePosition = (time: number) => {
    return (time / totalTime) * timeScale;
  };

  const getTaskHeight = (task: GanttTask) => {
    return getTimePosition(task.end - task.start);
  };

  const getTaskTop = (task: GanttTask) => {
    return getTimePosition(task.start);
  };

  const timeMarkers = useMemo(() => {
    const markers = [];
    const interval = Math.ceil(totalTime / 10);
    for (let i = 0; i <= totalTime; i += interval) {
      markers.push(i);
    }
    return markers;
  }, [totalTime]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flight Bar Timeline (Time vs Station)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div style={{ minWidth: flightBars.length * columnWidth + 80 }}>
            {/* Flight bar header */}
            <div className="relative flex" style={{ height: headerHeight }}>
              <div className="w-20 flex items-center justify-center text-sm font-medium bg-gray-50 border-r border-gray-300 border-b">
                Time
              </div>
              {flightBars.map((flightBarId) => (
                <div
                  key={flightBarId}
                  className="flex items-center justify-center text-sm font-medium bg-gray-50 border-r border-gray-300 border-b px-2"
                  style={{ width: columnWidth }}
                >
                  <span className="truncate text-center">{flightBarId}</span>
                </div>
              ))}
            </div>

            {/* Timeline area */}
            <div className="relative flex">
              {/* Time markers column */}
              <div className="w-20 relative border-r border-gray-300" style={{ height: timeScale }}>
                {timeMarkers.map((time) => (
                  <div
                    key={time}
                    className="absolute left-0 right-0 text-xs text-gray-600 border-t border-gray-200 flex items-center justify-center"
                    style={{ top: getTimePosition(time) }}
                  >
                    <span>{time.toFixed(0)}m</span>
                  </div>
                ))}
              </div>

              {/* Flight bar columns */}
              {flightBars.map((flightBarId) => {
                const flightBarTasks = tasks.filter(task => task.flightBarId === flightBarId);
                
                return (
                  <div 
                    key={flightBarId} 
                    className="relative border-r border-gray-200" 
                    style={{ width: columnWidth, height: timeScale }}
                  >
                    {/* Time grid lines */}
                    {timeMarkers.map((time) => (
                      <div
                        key={time}
                        className="absolute left-0 right-0 border-t border-gray-100"
                        style={{ top: getTimePosition(time) }}
                      />
                    ))}
                    
                    {/* Background */}
                    <div className="absolute top-0 bottom-0 left-0 right-0 bg-gray-50" />
                    
                    {/* Tasks for this flight bar */}
                    {flightBarTasks.map((task) => (
                      <div
                        key={task.id}
                        className="absolute left-1 right-1 rounded text-white text-xs flex items-center justify-center font-medium shadow-sm border border-white/20"
                        style={{
                          top: getTaskTop(task),
                          height: Math.max(getTaskHeight(task), 2),
                          backgroundColor: operationColors[task.operation],
                        }}
                        title={`${task.operation}: ${task.start.toFixed(1)} - ${task.end.toFixed(1)} min`}
                      >
                        {getTaskHeight(task) > 20 && (
                          <span className="truncate px-1 text-center" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                            {task.operation}
                          </span>
                        )}
                      </div>
                    ))}
                    
                    {/* Show gaps where flight bar is idle */}
                    {flightBarTasks.length === 0 && (
                      <div className="absolute top-1 bottom-1 left-1 right-1 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                        <span style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                          No tasks
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Operations:</h4>
          <div className="flex flex-wrap gap-2">
            {operations.map((operation) => (
              <div key={operation} className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: operationColors[operation] }}
                />
                <span className="text-xs">{operation}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Instructions */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Timeline View:</strong> Time flows vertically (Y-axis), flight bars are arranged horizontally (X-axis). 
            Colors indicate which operation/station each flight bar is currently processing.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default GanttChart;
