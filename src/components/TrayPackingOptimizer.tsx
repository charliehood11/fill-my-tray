import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrayPackingOptimizer } from '../utils/packingAlgorithm';
import { Tray, Component, PackingResult } from '../types/packing';
import { Upload, Package, Settings, BarChart3, Plus, Minus } from 'lucide-react';
import TrayVisualization from './TrayVisualization';
import { toast } from '@/hooks/use-toast';

// Default data
const defaultTrays: Tray[] = [
  {"id":"tray01","width":2000,"depth":2100},
  {"id":"tray02","width":3400,"depth":1000},
  {"id":"pfd_tray","name":"PFD tray","width":2700,"depth":1070}
];

const defaultComponents: Component[] = [
  {"id":"C1","w":137,"d":112},
  {"id":"C2","w":44,"d":174},
  {"id":"C3","w":183,"d":28},
  {"id":"C4","w":56,"d":193},
  {"id":"C5","w":172,"d":47},
  {"id":"C6","w":123,"d":101},
  {"id":"C7","w":199,"d":66},
  {"id":"C8","w":19,"d":157},
  {"id":"C9","w":85,"d":142},
  {"id":"C10","w":192,"d":53},
  {"id":"C11","w":61,"d":188},
  {"id":"C12","w":110,"d":21}
];

const allowedPriorities = ['low', 'medium', 'high', 'critical'] as const;

const validateTrays = (data: unknown): Tray[] => {
  const trayList = Array.isArray(data) ? data : [data];

  if (trayList.length === 0) {
    throw new Error('No trays found in file.');
  }

  trayList.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Tray ${index + 1}: must be an object.`);
    }

    const tray = item as Partial<Tray>;

    if (!tray.id || typeof tray.id !== 'string') {
      throw new Error(`Tray ${index + 1}: "id" is required and must be a string.`);
    }

    if (typeof tray.width !== 'number' || !Number.isFinite(tray.width) || tray.width <= 0) {
      throw new Error(`Tray ${index + 1} (${tray.id}): "width" must be a positive number.`);
    }

    if (typeof tray.depth !== 'number' || !Number.isFinite(tray.depth) || tray.depth <= 0) {
      throw new Error(`Tray ${index + 1} (${tray.id}): "depth" must be a positive number.`);
    }
  });

  return trayList as Tray[];
};

const validateComponents = (data: unknown): Component[] => {
  const componentList = Array.isArray(data) ? data : [data];

  if (componentList.length === 0) {
    throw new Error('No components found in file.');
  }

  componentList.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Component ${index + 1}: must be an object.`);
    }

    const component = item as Partial<Component>;

    if (!component.id || typeof component.id !== 'string') {
      throw new Error(`Component ${index + 1}: "id" is required and must be a string.`);
    }

    if (typeof component.w !== 'number' || !Number.isFinite(component.w) || component.w <= 0) {
      throw new Error(`Component ${index + 1} (${component.id}): "w" must be a positive number.`);
    }

    if (typeof component.d !== 'number' || !Number.isFinite(component.d) || component.d <= 0) {
      throw new Error(`Component ${index + 1} (${component.id}): "d" must be a positive number.`);
    }

    if (
      component.quantity !== undefined &&
      (typeof component.quantity !== 'number' || !Number.isFinite(component.quantity) || component.quantity < 0)
    ) {
      throw new Error(`Component ${index + 1} (${component.id}): "quantity" must be a non-negative number.`);
    }

    if (component.priority !== undefined && !allowedPriorities.includes(component.priority)) {
      throw new Error(
        `Component ${index + 1} (${component.id}): "priority" must be one of ${allowedPriorities.join(', ')}.`
      );
    }
  });

  return componentList as Component[];
};

const TrayPackingOptimizerComponent = () => {
  const [trays, setTrays] = useState<Tray[]>(defaultTrays);
  const [components, setComponents] = useState<Component[]>(defaultComponents);
  const [selectedTray, setSelectedTray] = useState<string>('');
  const [componentSettings, setComponentSettings] = useState<{[key: string]: {quantity: number, priority: 'low' | 'medium' | 'high' | 'critical'}}>(() => {
    const initialSettings: {[key: string]: {quantity: number, priority: 'low' | 'medium' | 'high' | 'critical'}} = {};
    defaultComponents.forEach(comp => {
      initialSettings[comp.id] = { quantity: 1, priority: 'medium' };
    });
    return initialSettings;
  });
  const [results, setResults] = useState<PackingResult | null>(null);
  const [spacing, setSpacing] = useState(100);
  const [edgeSpacing, setEdgeSpacing] = useState(100);
  const [allowRotation, setAllowRotation] = useState(true);

  const handleTrayUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          setTrays(Array.isArray(data) ? data : [data]);
          setSelectedTray(''); // Reset selection when new data is uploaded
        } catch (error) {
          console.error('Error parsing tray JSON:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleComponentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          const componentList = Array.isArray(data) ? data : [data];
          setComponents(componentList);
          
          // Initialize component settings for new data
          const initialSettings: {[key: string]: {quantity: number, priority: 'low' | 'medium' | 'high' | 'critical'}} = {};
          componentList.forEach(comp => {
            initialSettings[comp.id] = { quantity: comp.quantity || 1, priority: 'medium' };
          });
          setComponentSettings(initialSettings);
        } catch (error) {
          console.error('Error parsing component JSON:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const updateComponentQuantity = (componentId: string, quantity: number) => {
    setComponentSettings(prev => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        quantity: Math.max(0, quantity)
      }
    }));
  };

  const updateComponentPriority = (componentId: string, priority: 'low' | 'medium' | 'high' | 'critical') => {
    setComponentSettings(prev => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        priority
      }
    }));
  };

  const runOptimization = () => {
    const tray = trays.find(t => t.id === selectedTray);
    if (!tray) return;

    // Filter components with quantity > 0 and add settings
    const selectedComponents = components
      .filter(comp => (componentSettings[comp.id]?.quantity || 0) > 0)
      .map(comp => ({
        ...comp,
        quantity: componentSettings[comp.id]?.quantity || 1,
        priority: componentSettings[comp.id]?.priority || 'medium'
      }));

    if (selectedComponents.length === 0) return;

    const optimizer = new TrayPackingOptimizer({
      spacing,
      edgeSpacing,
      allowRotation,
      optimizationLevel: 'balanced'
    });

    const result = optimizer.packTray(tray, selectedComponents);
    setResults(result);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Tray Packing Optimizer
          </h1>
          <p className="text-xl text-gray-600">
            Intelligent 2D bin packing with priority-based placement and spacing constraints
          </p>
        </div>

        <Tabs defaultValue="input" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="input" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Input Data
            </TabsTrigger>
            <TabsTrigger value="selection" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Selection
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Trays JSON</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 font-medium">Default data is pre-loaded. Upload a file to replace it.</p>
                    </div>
                    <Input
                      type="file"
                      accept=".json"
                      onChange={handleTrayUpload}
                      className="cursor-pointer"
                    />
                    <div className="text-sm text-gray-600">
                      Expected format: <code>[{`{"id": "tray1", "width": 1000, "depth": 800}`}]</code>
                    </div>
                    {trays.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold">Loaded Trays ({trays.length}):</h4>
                        {trays.map(tray => (
                          <Badge key={tray.id} variant="secondary">
                            {tray.name || tray.id} ({tray.width}×{tray.depth}mm)
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upload Components JSON</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 font-medium">Default data is pre-loaded. Upload a file to replace it.</p>
                    </div>
                    <Input
                      type="file"
                      accept=".json"
                      onChange={handleComponentUpload}
                      className="cursor-pointer"
                    />
                    <div className="text-sm text-gray-600">
                      Expected format: <code>[{`{"id": "comp1", "w": 200, "d": 150, "quantity": 5}`}]</code>
                    </div>
                    {components.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold">Loaded Components ({components.length}):</h4>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {components.map(comp => (
                            <Badge key={comp.id} variant="outline">
                              {comp.name || comp.id} ({comp.w}×{comp.d}mm)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="selection" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Select Tray</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {trays.map(tray => (
                      <div key={tray.id} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={tray.id}
                          name="tray"
                          value={tray.id}
                          checked={selectedTray === tray.id}
                          onChange={(e) => setSelectedTray(e.target.value)}
                        />
                        <Label htmlFor={tray.id} className="cursor-pointer">
                          {tray.name || tray.id} ({tray.width}×{tray.depth}mm)
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Configure Components</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {components.map(comp => (
                      <div key={comp.id} className="p-3 border rounded-lg space-y-3">
                        <div className="font-medium">{comp.name || comp.id} ({comp.w}×{comp.d}mm)</div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Quantity:</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateComponentQuantity(comp.id, (componentSettings[comp.id]?.quantity || 1) - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center">{componentSettings[comp.id]?.quantity || 1}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateComponentQuantity(comp.id, (componentSettings[comp.id]?.quantity || 1) + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Priority:</Label>
                            <Select
                              value={componentSettings[comp.id]?.priority || 'medium'}
                              onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => 
                                updateComponentPriority(comp.id, value)
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className={`w-3 h-3 rounded-full ${getPriorityColor(componentSettings[comp.id]?.priority || 'medium')}`}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Optimization Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="spacing">Component Spacing (mm)</Label>
                  <Input
                    id="spacing"
                    type="number"
                    value={spacing}
                    onChange={(e) => setSpacing(Number(e.target.value))}
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
                    onChange={(e) => setEdgeSpacing(Number(e.target.value))}
                    min="0"
                    max="500"
                  />
                  <p className="text-sm text-gray-600 mt-1">Minimum distance from tray edges</p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="rotation"
                    checked={allowRotation}
                    onChange={(e) => setAllowRotation(e.target.checked)}
                  />
                  <Label htmlFor="rotation">Allow 90° rotation</Label>
                </div>
                <Button 
                  onClick={runOptimization}
                  disabled={!selectedTray || components.filter(comp => (componentSettings[comp.id]?.quantity || 0) > 0).length === 0}
                  className="w-full"
                >
                  Run Optimization
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {results ? (
              <div className="grid gap-6">
                <div className="grid md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6 text-center">
                      <h3 className="font-semibold text-2xl text-blue-600">
                        {results.totalTraysUsed}
                      </h3>
                      <p className="text-gray-600">Trays Used</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6 text-center">
                      <h3 className="font-semibold text-2xl text-green-600">
                        {results.totalComponentsPlaced}
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
                        {results.averageEfficiency.toFixed(1)}%
                      </h3>
                      <p className="text-gray-600">Avg Efficiency</p>
                    </CardContent>
                  </Card>
                </div>

                {results.trayResults.map((trayResult) => (
                  <Card key={trayResult.trayNumber}>
                    <CardHeader>
                      <CardTitle>Tray {trayResult.trayNumber} — {trayResult.tray.name || trayResult.tray.id.split('_')[0]} ({trayResult.efficiency.toFixed(1)}% efficiency, {trayResult.placedComponents.length} components)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TrayVisualization result={trayResult} />
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        {trayResult.placedComponents.map((comp, index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{comp.name || comp.id.split('_')[0]}</div>
                              {comp.priority && (
                                <div className={`w-3 h-3 rounded-full ${getPriorityColor(comp.priority)}`}></div>
                              )}
                              {comp.rotation === 90 && <Badge variant="secondary">Rotated</Badge>}
                            </div>
                            <div className="text-sm text-gray-600">
                              Position: ({comp.x}, {comp.y})mm | Size: {comp.width}×{comp.height}mm
                            </div>
                          </div>
                        ))}
                      </div>
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
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-gray-600">Run optimization to see results</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TrayPackingOptimizerComponent;
