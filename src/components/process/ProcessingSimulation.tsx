
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ProcessingResult } from '../../types/processing';
import { Play, Pause, RotateCcw, Square } from 'lucide-react';

interface ProcessingSimulationProps {
  results: ProcessingResult;
}

const ProcessingSimulation: React.FC<ProcessingSimulationProps> = ({ results }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState([1]);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  const maxTime = results.totalEstimatedTime;
  const timeScale = 100; // pixels per minute

  // Station layout from the data
  const stationLayout = {
    "S":   { "row": 1, "x": 0 },
    "L":   { "row": 1, "x": 1 },
    "D1":  { "row": 0, "x": 2 },
    "D2":  { "row": 0, "x": 3 },
    "D3":  { "row": 0, "x": 4 },
    "D4":  { "row": 0, "x": 5 },
    "D5":  { "row": 0, "x": 6 },
    "D8":  { "row": 0, "x": 7 },
    "D9":  { "row": 0, "x": 8 },
    "D10": { "row": 0, "x": 9 },
    "D11": { "row": 0, "x": 10 },
    "D12": { "row": 0, "x": 11 },
    "D13": { "row": 0, "x": 12 },
    "D14": { "row": 0, "x": 13 },
    "D15": { "row": 0, "x": 14 },
    "D16": { "row": 0, "x": 15 },
    "D17": { "row": 0, "x": 16 },
    "S1":  { "row": 2, "x": 2 },
    "S2":  { "row": 2, "x": 3 },
    "S3":  { "row": 2, "x": 4 },
    "S4":  { "row": 2, "x": 5 },
    "S5":  { "row": 2, "x": 6 },
    "S6":  { "row": 2, "x": 7 },
    "S7":  { "row": 2, "x": 8 },
    "S8":  { "row": 2, "x": 9 },
    "S9":  { "row": 2, "x": 10 },
    "S10": { "row": 2, "x": 11 },
    "S11": { "row": 2, "x": 12 },
    "S12": { "row": 2, "x": 13 },
    "S13": { "row": 2, "x": 14 },
    "S14": { "row": 2, "x": 15 },
    "S15": { "row": 2, "x": 16 },
    "S16": { "row": 2, "x": 17 }
  };

  const stationSize = 60;
  const stationSpacing = 80;
  const rowHeight = 100;

  useEffect(() => {
    if (isPlaying) {
      const animate = (timestamp: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = timestamp;
        const deltaTime = (timestamp - lastTimeRef.current) / 1000; // Convert to seconds
        
        setCurrentTime(prev => {
          const newTime = prev + deltaTime * speed[0] * 10; // Speed multiplier
          if (newTime >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          return newTime;
        });
        
        lastTimeRef.current = timestamp;
        if (isPlaying) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      lastTimeRef.current = undefined;
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, speed, maxTime]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(maxTime);
  };

  const getFlightBarColor = (index: number) => {
    const colors = [
      '#3B82F6', // blue
      '#EF4444', // red
      '#10B981', // green
      '#F59E0B', // yellow
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#06B6D4', // cyan
      '#84CC16', // lime
    ];
    return colors[index % colors.length];
  };

  const getActiveFlightBarsAtStation = (station: string, time: number) => {
    const activeFlightBars: Array<{ flightBar: any, step: any, color: string }> = [];
    
    results.flightBars.forEach((flightBar, index) => {
      flightBar.steps.forEach(step => {
        if (step.operation === station && 
            step.startTime !== undefined && 
            step.endTime !== undefined &&
            time >= step.startTime && 
            time <= step.endTime) {
          activeFlightBars.push({
            flightBar,
            step,
            color: getFlightBarColor(index)
          });
        }
      });
    });
    
    return activeFlightBars;
  };

  const svgWidth = Math.max(...Object.values(stationLayout).map(s => s.x)) * stationSpacing + stationSize + 40;
  const svgHeight = 3 * rowHeight + 40;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Process Simulation</CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePlayPause}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={handleStop}>
              <Square className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm">Speed:</span>
            <Slider
              value={speed}
              onValueChange={setSpeed}
              max={5}
              min={0.1}
              step={0.1}
              className="w-24"
            />
            <span className="text-sm">{speed[0]}x</span>
          </div>
          
          <div className="text-sm">
            Time: {currentTime.toFixed(1)} / {maxTime.toFixed(1)} min
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg p-4 bg-gray-50 overflow-auto">
          <svg width={svgWidth} height={svgHeight} className="bg-white rounded">
            {/* Draw stations */}
            {Object.entries(stationLayout).map(([stationName, layout]) => {
              const x = layout.x * stationSpacing + 20;
              const y = layout.row * rowHeight + 20;
              const activeFlightBars = getActiveFlightBarsAtStation(stationName, currentTime);
              
              return (
                <g key={stationName}>
                  {/* Station circle */}
                  <circle
                    cx={x + stationSize/2}
                    cy={y + stationSize/2}
                    r={stationSize/2}
                    fill={activeFlightBars.length > 0 ? "#FEF3C7" : "#F3F4F6"}
                    stroke={activeFlightBars.length > 0 ? "#F59E0B" : "#9CA3AF"}
                    strokeWidth="2"
                  />
                  
                  {/* Station label */}
                  <text
                    x={x + stationSize/2}
                    y={y + stationSize/2 - 5}
                    textAnchor="middle"
                    className="text-xs font-medium"
                    fill="#374151"
                  >
                    {stationName}
                  </text>
                  
                  {/* Show active flight bars */}
                  {activeFlightBars.map((active, index) => (
                    <text
                      key={index}
                      x={x + stationSize/2}
                      y={y + stationSize/2 + 8 + index * 8}
                      textAnchor="middle"
                      className="text-xs"
                      fill={active.color}
                    >
                      {active.flightBar.flightBarId}
                    </text>
                  ))}
                </g>
              );
            })}
            
            {/* Draw progress indicator */}
            <line
              x1={20}
              y1={svgHeight - 20}
              x2={svgWidth - 20}
              y2={svgHeight - 20}
              stroke="#E5E7EB"
              strokeWidth="4"
            />
            <line
              x1={20}
              y1={svgHeight - 20}
              x2={20 + (currentTime / maxTime) * (svgWidth - 40)}
              y2={svgHeight - 20}
              stroke="#3B82F6"
              strokeWidth="4"
            />
          </svg>
        </div>
        
        {/* Flight bar legend */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {results.flightBars.map((flightBar, index) => (
            <div key={flightBar.flightBarId} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: getFlightBarColor(index) }}
              />
              <span className="text-sm">{flightBar.flightBarId} ({flightBar.kNumber})</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcessingSimulation;
