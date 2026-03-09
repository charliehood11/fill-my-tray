
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SchedulerComponent } from '../../types/scheduler';
import { toast } from '@/hooks/use-toast';

interface ComponentUploadProps {
  components: SchedulerComponent[];
  onComponentsUpdate: (components: SchedulerComponent[]) => void;
}

const ComponentUpload: React.FC<ComponentUploadProps> = ({ components, onComponentsUpdate }) => {
  const handleComponentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          const componentList = Array.isArray(data) ? data : [data];
          onComponentsUpdate(componentList);
        } catch (error) {
          console.error('Error parsing component JSON:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const getUniqueKNumbers = () => {
    const kNumbers = new Set(components.map(comp => comp.k));
    return Array.from(kNumbers).sort();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Components JSON</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-medium">Current products data is pre-loaded. Upload a file to replace it.</p>
          </div>
          <Input
            type="file"
            accept=".json"
            onChange={handleComponentUpload}
            className="cursor-pointer"
          />
          <div className="text-sm text-gray-600">
            Expected format: <code>[{`{"id": "comp1", "w": 200, "d": 150, "k": "K01", "quantity": 5, "priority": "high"}`}]</code>
          </div>
          {components.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Loaded Components ({components.length}):</h4>
              <div className="space-y-1">
                <p className="text-sm font-medium">K-Numbers: {getUniqueKNumbers().join(', ')}</p>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {components.map(comp => (
                  <Badge key={comp.id} variant="outline">
                    {comp.name || comp.id} ({comp.w}×{comp.d}mm, K: {comp.k})
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ComponentUpload;
