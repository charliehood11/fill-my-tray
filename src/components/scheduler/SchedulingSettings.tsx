
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SchedulingSettingsProps {
  spacing: number;
  edgeSpacing: number;
  allowRotation: boolean;
  onSpacingChange: (spacing: number) => void;
  onEdgeSpacingChange: (edgeSpacing: number) => void;
  onAllowRotationChange: (allowRotation: boolean) => void;
  onRunScheduling: () => void;
  canRunScheduling: boolean;
}

const SchedulingSettings: React.FC<SchedulingSettingsProps> = ({
  spacing,
  edgeSpacing,
  allowRotation,
  onSpacingChange,
  onEdgeSpacingChange,
  onAllowRotationChange,
  onRunScheduling,
  canRunScheduling
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduling Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="spacing">Component Spacing (mm)</Label>
          <Input
            id="spacing"
            type="number"
            value={spacing}
            onChange={(e) => onSpacingChange(Number(e.target.value))}
            min="0"
            max="500"
          />
          <p className="text-sm text-gray-600 mt-1">Minimum distance between components</p>
        </div>
        <div>
          <Label htmlFor="edgeSpacing">Edge Spacing (mm)</Label>
          <Input
            id="edgeSpacing"
            type="number"
            value={edgeSpacing}
            onChange={(e) => onEdgeSpacingChange(Number(e.target.value))}
            min="0"
            max="500"
          />
          <p className="text-sm text-gray-600 mt-1">Minimum distance from flight bar edges</p>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="rotation"
            checked={allowRotation}
            onChange={(e) => onAllowRotationChange(e.target.checked)}
          />
          <Label htmlFor="rotation">Allow 90° rotation</Label>
        </div>
        <Button 
          onClick={onRunScheduling}
          disabled={!canRunScheduling}
          className="w-full"
        >
          Run Scheduling
        </Button>
      </CardContent>
    </Card>
  );
};

export default SchedulingSettings;
