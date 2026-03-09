import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Settings, Clock, Route, Download } from 'lucide-react';
import FlightBarInput from './process/FlightBarInput';
import OperationsUpload from './process/OperationsUpload';
import TravelTimesUpload from './process/TravelTimesUpload';
import ProcessingResults from './process/ProcessingResults';
import StationCapacityConfig from './process/StationCapacityConfig';
import { FlightBarData, OperationsData, ProcessingResult, TravelTimes, StationCapacity } from '../types/processing';
import { ProcessScheduler } from '../utils/processScheduler';
import { defaultOperations, defaultTravelTimes, defaultStationCapacities } from '../data/defaultProcessingData';

const ProcessSchedulingComponent = () => {
  const [flightBars, setFlightBars] = useState<FlightBarData[]>([]);
  const [operations, setOperations] = useState<OperationsData>(defaultOperations);
  const [travelTimes, setTravelTimes] = useState<TravelTimes | null>(defaultTravelTimes);
  const [stationCapacities, setStationCapacities] = useState<StationCapacity>(defaultStationCapacities);
  const [results, setResults] = useState<ProcessingResult | null>(null);
  const [timeMultiplier, setTimeMultiplier] = useState(1.0);
  const [shiftLength, setShiftLength] = useState<number>(480); // 8 hours in minutes

  // Load flight bar data from scheduler if available
  useEffect(() => {
    const schedulerResults = localStorage.getItem('flightBarSchedulerResults');
    if (schedulerResults) {
      try {
        const data = JSON.parse(schedulerResults);
        if (data.flightBarResults) {
          const flightBarData: FlightBarData[] = data.flightBarResults.map((result: any) => ({
            id: result.flightBar.id,
            kNumber: result.flightBar.k,
            componentCount: result.placedComponents.length,
            efficiency: result.efficiency
          }));
          setFlightBars(flightBarData);
          setResults(null);
        }
      } catch (error) {
        console.error('Error loading flight bar scheduler results:', error);
      }
    }
  }, []);

  const handleFlightBarsUpdate = (newFlightBars: FlightBarData[]) => {
    setFlightBars(newFlightBars);
    setResults(null);
  };

  const handleOperationsUpdate = (newOperations: OperationsData) => {
    setOperations(newOperations);
    setResults(null);
  };

  const handleTravelTimesUpdate = (newTravelTimes: TravelTimes | null) => {
    setTravelTimes(newTravelTimes);
    setResults(null);
  };

  const handleStationCapacityUpdate = (newCapacities: StationCapacity) => {
    setStationCapacities(newCapacities);
    setResults(null);
  };

  const importFromScheduler = () => {
    const schedulerResults = localStorage.getItem('flightBarSchedulerResults');
    if (schedulerResults) {
      try {
        const data = JSON.parse(schedulerResults);
        if (data.flightBarResults) {
          const flightBarData: FlightBarData[] = data.flightBarResults.map((result: any) => ({
            id: result.flightBar.id,
            kNumber: result.flightBar.k,
            componentCount: result.placedComponents.length,
            efficiency: result.efficiency
          }));
          setFlightBars(flightBarData);
          setResults(null);
        }
      } catch (error) {
        console.error('Error importing from scheduler:', error);
      }
    }
  };

  const calculateProcessingTime = () => {
    if (flightBars.length === 0) return;

    const scheduler = new ProcessScheduler(operations, travelTimes, timeMultiplier, stationCapacities);
    const result = scheduler.calculateMinimumProcessingTime(flightBars, shiftLength);
    setResults(result);
  };

  const canCalculate = flightBars.length > 0 && Object.keys(operations).length > 0;
  const hasSchedulerData = localStorage.getItem('flightBarSchedulerResults') !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Process Scheduling Calculator
          </h1>
          <p className="text-xl text-gray-600">
            Calculate minimum processing time for flight bars based on K-number operations with station capacity constraints
          </p>
        </div>

        <Tabs defaultValue="input" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="input" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Input Data
            </TabsTrigger>
            <TabsTrigger value="operations" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Operations
            </TabsTrigger>
            <TabsTrigger value="travel" className="flex items-center gap-2">
              <Route className="w-4 h-4" />
              Travel Times
            </TabsTrigger>
            <TabsTrigger value="capacity" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Capacity
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="space-y-6">
            <div className="grid gap-6">
              {hasSchedulerData && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Import from Flight Bar Scheduler</h3>
                        <p className="text-gray-600">Load flight bar data from your previous scheduling results</p>
                      </div>
                      <Button onClick={importFromScheduler} className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Import Data
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timeMultiplier">Time Multiplier (1.0 = minimum time)</Label>
                      <div className="flex items-center gap-4">
                        <Input
                          id="timeMultiplier"
                          type="number"
                          min="0.1"
                          max="5.0"
                          step="0.1"
                          value={timeMultiplier}
                          onChange={(e) => setTimeMultiplier(Number(e.target.value))}
                          className="w-32"
                        />
                        <span className="text-sm text-gray-600">
                          Adjust processing time estimate (1.0 = min time, 2.0 = max time)
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="shiftLength">Shift Length (minutes)</Label>
                      <div className="flex items-center gap-4">
                        <Input
                          id="shiftLength"
                          type="number"
                          min="60"
                          max="1440"
                          step="30"
                          value={shiftLength}
                          onChange={(e) => setShiftLength(Number(e.target.value))}
                          className="w-32"
                        />
                        <span className="text-sm text-gray-600">
                          Total shift time ({(shiftLength / 60).toFixed(1)} hours)
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <FlightBarInput 
                flightBars={flightBars}
                onFlightBarsUpdate={handleFlightBarsUpdate}
                onCalculate={calculateProcessingTime}
                canCalculate={canCalculate}
              />
            </div>
          </TabsContent>

          <TabsContent value="operations" className="space-y-6">
            <OperationsUpload
              operations={operations}
              onOperationsUpdate={handleOperationsUpdate}
            />
          </TabsContent>

          <TabsContent value="travel" className="space-y-6">
            <TravelTimesUpload
              travelTimes={travelTimes}
              onTravelTimesUpdate={handleTravelTimesUpdate}
            />
          </TabsContent>

          <TabsContent value="capacity" className="space-y-6">
            <StationCapacityConfig
              stationCapacities={stationCapacities}
              onCapacityUpdate={handleStationCapacityUpdate}
            />
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {results ? (
              <ProcessingResults results={results} />
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-gray-600">Enter flight bar data and calculate to see results</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProcessSchedulingComponent;
