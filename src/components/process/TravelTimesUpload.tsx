
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TravelTimes } from '../../types/processing';
import { toast } from '@/hooks/use-toast';

interface TravelTimesUploadProps {
  travelTimes: TravelTimes | null;
  onTravelTimesUpdate: (travelTimes: TravelTimes | null) => void;
}

const TravelTimesUpload: React.FC<TravelTimesUploadProps> = ({
  travelTimes,
  onTravelTimesUpdate
}) => {
  const handleTravelTimesUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          console.log('Parsed travel times data:', data);
          
          if (data.Travel_Times) {
            console.log('Found Travel_Times property, using it');
            onTravelTimesUpdate(data.Travel_Times);
          } else if (typeof data === 'object' && !Array.isArray(data)) {
            // Check if the data looks like travel times directly
            const firstKey = Object.keys(data)[0];
            if (firstKey && typeof data[firstKey] === 'object') {
              console.log('Data appears to be travel times format directly');
              onTravelTimesUpdate(data);
            } else {
              console.log('Using data as travel times');
              onTravelTimesUpdate(data);
            }
          } else {
            console.error('Unexpected travel times format:', data);
          }
        } catch (error) {
          console.error('Error parsing travel times JSON:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const clearTravelTimes = () => {
    onTravelTimesUpdate(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Travel Times Between Operations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">
              Default travel times data is pre-loaded. Upload a JSON file to replace it, or clear to disable travel times.
            </p>
          </div>
          
          <div className="flex gap-2">
            <Input
              type="file"
              accept=".json"
              onChange={handleTravelTimesUpload}
              className="cursor-pointer flex-1"
            />
            {travelTimes && (
              <button
                onClick={clearTravelTimes}
                className="px-3 py-2 text-sm bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100"
              >
                Clear
              </button>
            )}
          </div>
          
          <div className="text-sm text-gray-600">
            Expected format: <code>{`{"Travel_Times": {"S": {"L": 0.6782, "D1": 5.0711}}}`}</code>
            <br />
            Or directly: <code>{`{"S": {"L": 0.6782, "D1": 5.0711}}`}</code>
          </div>

          {travelTimes && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="default">Travel Times Loaded</Badge>
                <span className="text-sm text-gray-600">
                  ({Object.keys(travelTimes).length} operations mapped)
                </span>
              </div>
              
              <div className="max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Time (min)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(travelTimes).slice(0, 10).map(([from, destinations]) =>
                      Object.entries(destinations).slice(0, 5).map(([to, time]) => (
                        <TableRow key={`${from}-${to}`}>
                          <TableCell className="font-medium">{from}</TableCell>
                          <TableCell>{to}</TableCell>
                          <TableCell>{time}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {Object.keys(travelTimes).length > 10 && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    ... and more (showing first 10 operations)
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TravelTimesUpload;
