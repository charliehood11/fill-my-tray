
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { FlightBarData } from '../../types/processing';
import { Plus, Trash2, Play } from 'lucide-react';

interface FlightBarInputProps {
  flightBars: FlightBarData[];
  onFlightBarsUpdate: (flightBars: FlightBarData[]) => void;
  onCalculate: () => void;
  canCalculate: boolean;
}

const FlightBarInput: React.FC<FlightBarInputProps> = ({
  flightBars,
  onFlightBarsUpdate,
  onCalculate,
  canCalculate
}) => {
  const [newFlightBar, setNewFlightBar] = useState({
    id: '',
    kNumber: '',
    componentCount: 1,
    efficiency: 0
  });

  const addFlightBar = () => {
    if (newFlightBar.id && newFlightBar.kNumber) {
      const flightBar: FlightBarData = {
        ...newFlightBar,
        id: newFlightBar.id || `FB_${Date.now()}`
      };
      
      onFlightBarsUpdate([...flightBars, flightBar]);
      setNewFlightBar({
        id: '',
        kNumber: '',
        componentCount: 1,
        efficiency: 0
      });
    }
  };

  const removeFlightBar = (index: number) => {
    const updated = flightBars.filter((_, i) => i !== index);
    onFlightBarsUpdate(updated);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setNewFlightBar(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Flight Bar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="flightBarId">Flight Bar ID</Label>
              <Input
                id="flightBarId"
                placeholder="FB_001"
                value={newFlightBar.id}
                onChange={(e) => handleInputChange('id', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="kNumber">K-Number</Label>
              <Input
                id="kNumber"
                placeholder="K01"
                value={newFlightBar.kNumber}
                onChange={(e) => handleInputChange('kNumber', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="componentCount">Component Count</Label>
              <Input
                id="componentCount"
                type="number"
                min="1"
                value={newFlightBar.componentCount}
                onChange={(e) => handleInputChange('componentCount', parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label htmlFor="efficiency">Efficiency (%)</Label>
              <Input
                id="efficiency"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={newFlightBar.efficiency}
                onChange={(e) => handleInputChange('efficiency', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={addFlightBar} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Flight Bar
            </Button>
            <Button 
              onClick={onCalculate} 
              disabled={!canCalculate}
              variant="default"
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Calculate Processing Time
            </Button>
          </div>
        </CardContent>
      </Card>

      {flightBars.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Flight Bars ({flightBars.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {flightBars.map((flightBar, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="font-medium">{flightBar.id}</div>
                    <Badge variant="outline">{flightBar.kNumber}</Badge>
                    <div className="text-sm text-gray-600">
                      {flightBar.componentCount} components
                    </div>
                    <div className="text-sm text-gray-600">
                      {flightBar.efficiency}% efficiency
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFlightBar(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FlightBarInput;
