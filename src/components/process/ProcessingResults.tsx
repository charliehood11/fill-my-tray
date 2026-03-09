
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProcessingResult } from '../../types/processing';
import { Download, Clock, TrendingUp } from 'lucide-react';
import ProcessingSimulation from './ProcessingSimulation';
import GanttChart from './GanttChart';

interface ProcessingResultsProps {
  results: ProcessingResult;
}

const ProcessingResults: React.FC<ProcessingResultsProps> = ({ results }) => {
  const exportToJson = () => {
    const exportData = {
      summary: {
        totalFlightBars: results.summary.totalFlightBars,
        averageEfficiency: Number(results.summary.averageEfficiency.toFixed(1)),
        totalMinTime: Number(results.totalMinTime.toFixed(1)),
        totalMaxTime: Number(results.totalMaxTime.toFixed(1)),
        totalEstimatedTime: Number(results.totalEstimatedTime.toFixed(1)),
        totalTravelTime: Number(results.totalTravelTime.toFixed(1)),
        shiftLength: results.shiftLength,
        maxRuns: results.maxRuns,
        bottleneckOperations: results.summary.bottleneckOperations
      },
      criticalPath: results.criticalPath,
      flightBars: results.flightBars.map(fb => ({
        flightBarId: fb.flightBarId,
        kNumber: fb.kNumber,
        componentCount: fb.componentCount,
        totalEstimatedTime: Number(fb.totalEstimatedTime.toFixed(1)),
        totalTravelTime: Number(fb.totalTravelTime.toFixed(1)),
        steps: fb.steps.map(step => ({
          operation: step.operation,
          estimatedTime: Number(step.estimatedTime.toFixed(1)),
          travelTimeFromPrevious: step.travelTimeFromPrevious ? Number(step.travelTimeFromPrevious.toFixed(1)) : 0,
          startTime: step.startTime ? Number(step.startTime.toFixed(1)) : 0,
          endTime: step.endTime ? Number(step.endTime.toFixed(1)) : 0
        }))
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `process-scheduling-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate maximum summed efficiency for the shift
  const maxSummedEfficiency = results.maxRuns ? 
    (results.maxRuns * results.summary.averageEfficiency) : 0;

  return (
    <div className="grid gap-6">
      {/* Processing Simulation */}
      <ProcessingSimulation results={results} />

      {/* Gantt Chart */}
      {results.ganttTasks && results.ganttTasks.length > 0 && (
        <GanttChart tasks={results.ganttTasks} totalTime={results.totalEstimatedTime} />
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Processing Time Results</h2>
        <Button onClick={exportToJson} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export JSON
        </Button>
      </div>

      <div className="grid md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-2xl text-blue-600">
              {results.totalEstimatedTime.toFixed(1)}
            </h3>
            <p className="text-gray-600">Minutes (Estimated)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-2xl text-green-600">
              {results.totalMinTime.toFixed(1)}
            </h3>
            <p className="text-gray-600">Minutes (Minimum)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-2xl text-red-600">
              {results.totalMaxTime.toFixed(1)}
            </h3>
            <p className="text-gray-600">Minutes (Maximum)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-2xl text-orange-600">
              {results.totalTravelTime.toFixed(1)}
            </h3>
            <p className="text-gray-600">Travel Time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-2xl text-purple-600">
              {results.summary.totalFlightBars}
            </h3>
            <p className="text-gray-600">Flight Bars</p>
          </CardContent>
        </Card>
        {results.maxRuns && (
          <Card>
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold text-2xl text-cyan-600">
                {results.maxRuns}
              </h3>
              <p className="text-gray-600">Max Runs/Shift</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Shift Analysis */}
      {results.shiftLength && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Shift Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900">Shift Length</h4>
                <p className="text-2xl font-bold text-blue-600">
                  {results.shiftLength} min
                </p>
                <p className="text-sm text-blue-700">
                  ({(results.shiftLength / 60).toFixed(1)} hours)
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900">Cycle Time</h4>
                <p className="text-2xl font-bold text-green-600">
                  {results.totalEstimatedTime.toFixed(1)} min
                </p>
                <p className="text-sm text-green-700">
                  Time for one complete cycle
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-900">Maximum Runs</h4>
                <p className="text-2xl font-bold text-purple-600">
                  {results.maxRuns || 0}
                </p>
                <p className="text-sm text-purple-700">
                  Complete cycles per shift
                </p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <h4 className="font-semibold text-amber-900">Max Summed Efficiency</h4>
                <p className="text-2xl font-bold text-amber-600">
                  {maxSummedEfficiency.toFixed(1)}%
                </p>
                <p className="text-sm text-amber-700">
                  Total efficiency per shift
                </p>
              </div>
            </div>
            {results.maxRuns && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-yellow-900 mb-2">Utilization Analysis</h4>
                <div className="text-sm text-yellow-800">
                  <p>• Productive time: {(results.maxRuns * results.totalEstimatedTime).toFixed(1)} minutes</p>
                  <p>• Idle time: {(results.shiftLength - (results.maxRuns * results.totalEstimatedTime)).toFixed(1)} minutes</p>
                  <p>• Utilization rate: {((results.maxRuns * results.totalEstimatedTime / results.shiftLength) * 100).toFixed(1)}%</p>
                  <p>• Maximum summed efficiency: {maxSummedEfficiency.toFixed(1)}%</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Critical Path</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {results.criticalPath.map((step, index) => (
              <div key={index} className="p-2 bg-red-50 border border-red-200 rounded">
                {step}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bottleneck Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {results.summary.bottleneckOperations.map((operation, index) => (
              <Badge key={index} variant="destructive">
                {operation}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Flight Bar Processing Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flight Bar</TableHead>
                <TableHead>K-Number</TableHead>
                <TableHead>Components</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Est. Time (min)</TableHead>
                <TableHead>Travel Time (min)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.flightBars.map((fb) => {
                const startTime = fb.steps[0]?.startTime || 0;
                const endTime = fb.steps[fb.steps.length - 1]?.endTime || fb.totalEstimatedTime;
                
                return (
                  <TableRow key={fb.flightBarId}>
                    <TableCell className="font-medium">{fb.flightBarId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{fb.kNumber}</Badge>
                    </TableCell>
                    <TableCell>{fb.componentCount}</TableCell>
                    <TableCell>{startTime.toFixed(1)} min</TableCell>
                    <TableCell>{endTime.toFixed(1)} min</TableCell>
                    <TableCell>{fb.totalEstimatedTime.toFixed(1)}</TableCell>
                    <TableCell>{fb.totalTravelTime.toFixed(1)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {results.flightBars.map((fb) => (
        <Card key={fb.flightBarId}>
          <CardHeader>
            <CardTitle>
              {fb.flightBarId} Operations ({fb.kNumber})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operation</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Travel Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fb.steps.map((step, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{step.operation}</TableCell>
                    <TableCell>{step.startTime?.toFixed(1) || '-'} min</TableCell>
                    <TableCell>{step.endTime?.toFixed(1) || '-'} min</TableCell>
                    <TableCell>{step.estimatedTime.toFixed(1)} min</TableCell>
                    <TableCell>
                      {step.travelTimeFromPrevious ? 
                        `${step.travelTimeFromPrevious.toFixed(1)} min` : 
                        '-'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProcessingResults;
