import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { SchedulingResult } from '../../types/scheduler';
import FlightBarVisualization from '../FlightBarVisualization';
import { Download } from 'lucide-react';

interface SchedulingResultsProps {
  results: SchedulingResult;
}

const SchedulingResults: React.FC<SchedulingResultsProps> = ({ results }) => {
  // State to track which flight bars are selected for export
  const [exportSelection, setExportSelection] = useState<{[key: string]: boolean}>({});

  // Initialize all flight bars as selected when results change
  useEffect(() => {
    const initialSelection: {[key: string]: boolean} = {};
    results.flightBarResults.forEach(result => {
      initialSelection[result.flightBar.id] = true;
    });
    setExportSelection(initialSelection);
  }, [results]);

  // Save results to localStorage for process scheduling integration
  useEffect(() => {
    localStorage.setItem('flightBarSchedulerResults', JSON.stringify(results));
  }, [results]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getComponentCounts = (flightBarId: string) => {
    const flightBarResult = results.flightBarResults.find(r => r.flightBar.id === flightBarId);
    const components = flightBarResult?.placedComponents || [];
    const counts: {[key: string]: number} = {};
    
    components.forEach(comp => {
      const baseId = comp.id.split('_')[0];
      counts[baseId] = (counts[baseId] || 0) + 1;
    });
    
    return counts;
  };

  const handleExportSelectionChange = (flightBarId: string, checked: boolean) => {
    setExportSelection(prev => ({
      ...prev,
      [flightBarId]: checked
    }));
  };

  const handleSelectAll = () => {
    const newSelection: {[key: string]: boolean} = {};
    results.flightBarResults.forEach(result => {
      newSelection[result.flightBar.id] = true;
    });
    setExportSelection(newSelection);
  };

  const handleDeselectAll = () => {
    const newSelection: {[key: string]: boolean} = {};
    results.flightBarResults.forEach(result => {
      newSelection[result.flightBar.id] = false;
    });
    setExportSelection(newSelection);
  };

  const exportToJson = () => {
    // Filter results based on selection
    const selectedFlightBarResults = results.flightBarResults.filter(
      result => exportSelection[result.flightBar.id]
    );

    const exportData = {
      summary: {
        totalFlightBars: selectedFlightBarResults.length,
        totalComponentsPlaced: selectedFlightBarResults.reduce((sum, result) => sum + result.placedComponents.length, 0),
        totalComponentsNotPlaced: results.unplacedComponents.length,
        averageEfficiency: selectedFlightBarResults.length > 0 
          ? Number((selectedFlightBarResults.reduce((sum, result) => sum + result.efficiency, 0) / selectedFlightBarResults.length).toFixed(1))
          : 0
      },
      flightBars: selectedFlightBarResults.map((result, index) => {
        const componentCounts = getComponentCounts(result.flightBar.id);
        return {
          flightBarNumber: index + 1,
          flightBarId: result.flightBar.id,
          kNumber: result.flightBar.k,
          efficiency: Number(result.efficiency.toFixed(1)),
          components: componentCounts,
          totalComponents: result.placedComponents.length
        };
      }),
      unplacedComponents: results.unplacedComponents.map(comp => ({
        id: comp.id,
        name: comp.name || comp.id,
        dimensions: `${comp.w}×${comp.d}mm`,
        kNumber: comp.k,
        priority: comp.priority || 'medium'
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flight-bar-scheduling-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedCount = Object.values(exportSelection).filter(Boolean).length;

  return (
    <div className="grid gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Scheduling Results</h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            {selectedCount} of {results.flightBarResults.length} flight bars selected for export
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={handleDeselectAll}>
              Deselect All
            </Button>
          </div>
          <Button onClick={exportToJson} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export JSON
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-2xl text-blue-600">
              {results.totalFlightBars}
            </h3>
            <p className="text-gray-600">Flight Bars Needed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-2xl text-green-600">
              {results.flightBarResults.reduce((sum, result) => sum + result.placedComponents.length, 0)}
            </h3>
            <p className="text-gray-600">Components Placed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-2xl text-red-600">
              {results.unplacedComponents.length}
            </h3>
            <p className="text-gray-600">Components Not Placed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-2xl text-purple-600">
              {(results.flightBarResults.reduce((sum, result) => sum + result.efficiency, 0) / results.flightBarResults.length || 0).toFixed(1)}%
            </h3>
            <p className="text-gray-600">Avg Efficiency</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Flight Bar Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Export</TableHead>
                <TableHead>Flight Bar</TableHead>
                <TableHead>K-Number</TableHead>
                <TableHead>Components</TableHead>
                <TableHead>Efficiency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.flightBarResults.map((result, index) => {
                const componentCounts = getComponentCounts(result.flightBar.id);
                return (
                  <TableRow key={result.flightBar.id}>
                    <TableCell>
                      <Checkbox
                        checked={exportSelection[result.flightBar.id] || false}
                        onCheckedChange={(checked) => 
                          handleExportSelectionChange(result.flightBar.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      Flight Bar {index + 1}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{result.flightBar.k}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {Object.entries(componentCounts).map(([componentId, count]) => (
                          <div key={componentId} className="text-sm">
                            {count}× {componentId}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{result.efficiency.toFixed(1)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {results.flightBarResults.map((result, index) => (
        <Card key={result.flightBar.id}>
          <CardHeader>
            <CardTitle>Flight Bar {index + 1} Layout (K: {result.flightBar.k})</CardTitle>
          </CardHeader>
          <CardContent>
            <FlightBarVisualization result={result} />
          </CardContent>
        </Card>
      ))}

      {results.unplacedComponents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Components That Could Not Be Placed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.unplacedComponents.map((comp, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant="destructive">
                    {comp.name || comp.id} ({comp.w}×{comp.d}mm)
                  </Badge>
                  <Badge variant="outline" className="text-xs">K: {comp.k}</Badge>
                  {comp.priority && (
                    <div className={`w-3 h-3 rounded-full ${getPriorityColor(comp.priority)}`}></div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SchedulingResults;
