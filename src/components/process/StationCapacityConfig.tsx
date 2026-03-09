
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StationCapacity } from '../../types/processing';

interface StationCapacityConfigProps {
  stationCapacities: StationCapacity;
  onCapacityUpdate: (capacities: StationCapacity) => void;
}

const StationCapacityConfig: React.FC<StationCapacityConfigProps> = ({
  stationCapacities,
  onCapacityUpdate
}) => {
  // Default stations from the layout
  const allStations = [
    'S', 'L', 'D1', 'D2', 'D3', 'D4', 'D5', 'D8', 'D9', 'D10', 'D11', 'D12', 
    'D13', 'D14', 'D15', 'D16', 'D17', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 
    'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13', 'S14', 'S15', 'S16'
  ];

  const handleCapacityChange = (station: string, capacity: number) => {
    const newCapacities = { ...stationCapacities, [station]: capacity };
    onCapacityUpdate(newCapacities);
  };

  const getMaxCapacity = (station: string) => {
    return ['S', 'L'].includes(station) ? 6 : 2;
  };

  const getDefaultCapacity = (station: string) => {
    return stationCapacities[station] || 1;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Station Capacities</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">
              Configure how many flight bars can be processed simultaneously at each station.
              S and L stations can handle 1-6 flight bars, others can handle 1-2.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">High Capacity Stations</h4>
              <div className="grid grid-cols-2 gap-4">
                {['S', 'L'].map(station => (
                  <div key={station} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{station}</Badge>
                      <Label htmlFor={`capacity-${station}`}>Capacity (1-6)</Label>
                    </div>
                    <Input
                      id={`capacity-${station}`}
                      type="number"
                      min="1"
                      max="6"
                      value={getDefaultCapacity(station)}
                      onChange={(e) => handleCapacityChange(station, parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Standard Stations (D-series)</h4>
              <div className="grid grid-cols-4 gap-4">
                {allStations.filter(s => s.startsWith('D')).map(station => (
                  <div key={station} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{station}</Badge>
                      <Label htmlFor={`capacity-${station}`} className="text-xs">Cap</Label>
                    </div>
                    <Input
                      id={`capacity-${station}`}
                      type="number"
                      min="1"
                      max="2"
                      value={getDefaultCapacity(station)}
                      onChange={(e) => handleCapacityChange(station, parseInt(e.target.value) || 1)}
                      className="w-16 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Standard Stations (S-series)</h4>
              <div className="grid grid-cols-4 gap-4">
                {allStations.filter(s => s.startsWith('S') && s !== 'S').map(station => (
                  <div key={station} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{station}</Badge>
                      <Label htmlFor={`capacity-${station}`} className="text-xs">Cap</Label>
                    </div>
                    <Input
                      id={`capacity-${station}`}
                      type="number"
                      min="1"
                      max="2"
                      value={getDefaultCapacity(station)}
                      onChange={(e) => handleCapacityChange(station, parseInt(e.target.value) || 1)}
                      className="w-16 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StationCapacityConfig;
