
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OperationsData } from '../../types/processing';
import { toast } from '@/hooks/use-toast';

interface OperationsUploadProps {
  operations: OperationsData;
  onOperationsUpdate: (operations: OperationsData) => void;
}

const OperationsUpload: React.FC<OperationsUploadProps> = ({
  operations,
  onOperationsUpdate
}) => {
  const handleOperationsUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          console.log('Parsed operations data:', data);
          
          // Handle different possible formats
          if (data.operations) {
            console.log('Found operations property, using it');
            onOperationsUpdate(data.operations);
          } else if (typeof data === 'object' && !Array.isArray(data)) {
            // Check if the data looks like operations directly (K-numbers as keys)
            const firstKey = Object.keys(data)[0];
            if (firstKey && firstKey.startsWith('K') && Array.isArray(data[firstKey])) {
              console.log('Data appears to be operations format directly');
              onOperationsUpdate(data);
            } else {
              console.log('Using data as operations');
              onOperationsUpdate(data);
            }
          } else {
            console.error('Unexpected data format:', data);
          }
        } catch (error) {
          console.error('Error parsing operations JSON:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>K-Number Operations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">
              Default operations data is pre-loaded. Upload a JSON file to replace it.
            </p>
          </div>
          
          <Input
            type="file"
            accept=".json"
            onChange={handleOperationsUpload}
            className="cursor-pointer"
          />
          
          <div className="text-sm text-gray-600">
            Expected format: <code>{`{"operations": {"K01": [["S", 100, 120], ["L", 15.0, 20.0]]}}`}</code>
            <br />
            Or directly: <code>{`{"K01": [["S", 100, 120], ["L", 15.0, 20.0]]}`}</code>
          </div>

          {Object.keys(operations).length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold">Loaded Operations ({Object.keys(operations).length} K-Numbers):</h4>
              
              {Object.entries(operations).map(([kNumber, ops]) => (
                <div key={kNumber} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{kNumber}</Badge>
                    <span className="text-sm text-gray-600">({ops.length} operations)</span>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Operation</TableHead>
                        <TableHead>Min Time</TableHead>
                        <TableHead>Max Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ops.map(([operation, minTime, maxTime], index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{operation}</TableCell>
                          <TableCell>{minTime}</TableCell>
                          <TableCell>{maxTime}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OperationsUpload;
