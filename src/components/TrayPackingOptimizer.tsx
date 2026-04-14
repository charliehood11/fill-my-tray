import React, { useState, useEffect } from 'react';
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
  {"id":"pfd_tray","name":"PFD tray","width":2700,"depth":1070},
  {"id":"s03_fb","name":"S03 FB","width":4000,"depth":2000},
  {"id":"tray_1800x1200","name":"S09 tray","width":1800,"depth":1200},
  {"id":"S09 hook","width":700,"depth":1100},
  {"id":"prospective_fb","name":"Prospective FB","width":4000,"depth":2000}
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
      component.numBatches !== undefined &&
      (typeof component.numBatches !== 'number' || !Number.isFinite(component.numBatches) || component.numBatches < 0)
    ) {
      throw new Error(`Component ${index + 1} (${component.id}): "numBatches" must be a non-negative number.`);
    }

    if (
      component.batchSize !== undefined &&
      (typeof component.batchSize !== 'number' || !Number.isFinite(component.batchSize) || component.batchSize <= 0)
    ) {
      throw new Error(`Component ${index + 1} (${component.id}): "batchSize" must be a positive number.`);
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
  const [selectedTray, setSelectedTray] = useState<string>(defaultTrays[0]?.id ?? '');
  const [componentSettings, setComponentSettings] = useState<{[key: string]: {numBatches: number, batchSize: number, priority: 'low' | 'medium' | 'high' | 'critical'}}>(() => {
    const initialSettings: {[key: string]: {numBatches: number, batchSize: number, priority: 'low' | 'medium' | 'high' | 'critical'}} = {};
    defaultComponents.forEach(comp => {
      initialSettings[comp.id] = { numBatches: 1, batchSize: 1, priority: 'medium' };
    });
    return initialSettings;
  });
  const [results, setResults] = useState<PackingResult | null>(null);
  const [spacing, setSpacing] = useState(10);
  const [edgeSpacing, setEdgeSpacing] = useState(0);
  const [allowRotation, setAllowRotation] = useState(true);
  const [packingMode, setPackingMode] = useState<'precise' | 'grid' | 'diagonal' | 'shelf'>('precise');
  const [gridColumns, setGridColumns] = useState(12);
  const [gridRows, setGridRows] = useState(5);
  const [shelfGridFill, setShelfGridFill] = useState(false);
  const [randomize, setRandomize] = useState(false);

  // Auto-configure settings when the S09 hook tray is selected
  useEffect(() => {
    if (selectedTray === 'S09 hook') {
      setPackingMode('shelf');
      setShelfGridFill(true);
      setGridColumns(2);
      setGridRows(7);
      setRandomize(true);
    }
  }, [selectedTray]);
  const [diagonalMinPerBar, setDiagonalMinPerBar] = useState(1);
  const [diagonalMaxPerBar, setDiagonalMaxPerBar] = useState(4);

  const handleTrayUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const trayList = validateTrays(data);
        setTrays(trayList);
        setSelectedTray(trayList[0]?.id ?? ''); // Auto-select first tray
      } catch (error) {
        console.error('Error parsing tray JSON:', error);
        toast({
          title: 'Tray Upload Failed',
          description: error instanceof Error ? error.message : 'Invalid JSON format.',
          variant: 'destructive',
        });
      }
    };

    reader.onerror = () => {
      toast({
        title: 'Tray Upload Failed',
        description: 'Unable to read the selected file.',
        variant: 'destructive',
      });
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const handleComponentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const componentList = validateComponents(data);
        
        // Initialize component settings for new data, using numBatches/batchSize from JSON
        const initialSettings: {[key: string]: {numBatches: number, batchSize: number, priority: 'low' | 'medium' | 'high' | 'critical'}} = {};
        componentList.forEach(comp => {
          initialSettings[comp.id] = {
            numBatches: comp.numBatches || 1,
            batchSize:  comp.batchSize  || 1,
            priority:   (comp.priority as 'low' | 'medium' | 'high' | 'critical') || 'medium',
          };
        });
        setComponentSettings(initialSettings);

        // Strip batch/priority fields from stored components so they don't get double-applied
        const cleanedComponents = componentList.map(({ numBatches, batchSize, priority, ...rest }) => rest) as Component[];
        setComponents(cleanedComponents);
      } catch (error) {
        console.error('Error parsing component JSON:', error);
        toast({
          title: 'Component Upload Failed',
          description: error instanceof Error ? error.message : 'Invalid JSON format.',
          variant: 'destructive',
        });
      }
    };

    reader.onerror = () => {
      toast({
        title: 'Component Upload Failed',
        description: 'Unable to read the selected file.',
        variant: 'destructive',
      });
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const updateComponentNumBatches = (componentId: string, numBatches: number) => {
    setComponentSettings(prev => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        numBatches: Math.max(0, numBatches),
      }
    }));
  };

  const updateComponentBatchSize = (componentId: string, batchSize: number) => {
    setComponentSettings(prev => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        batchSize: Math.max(1, batchSize),
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

    // Filter components with at least 1 batch and add settings
    const selectedComponents = components
      .filter(comp => (componentSettings[comp.id]?.numBatches || 0) > 0)
      .map(comp => ({
        ...comp,
        numBatches: componentSettings[comp.id]?.numBatches || 1,
        batchSize:  componentSettings[comp.id]?.batchSize  || 1,
        priority:   componentSettings[comp.id]?.priority   || 'medium',
      }));

    if (selectedComponents.length === 0) return;

    const optimizer = new TrayPackingOptimizer({
      spacing,
      edgeSpacing,
      allowRotation,
      optimizationLevel: 'balanced',
      packingMode,
      gridColumns,
      gridRows,
      randomize,
      shelfGridFill,
      diagonalMinPerBar,
      diagonalMaxPerBar,
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
                      Expected format: <code>[{`{"id": "comp1", "w": 200, "d": 150, "numBatches": 3, "batchSize": 12}`}]</code>
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
                        
                        <div className="flex flex-wrap items-center gap-4">
                          {/* Number of batches */}
                          <div className="flex items-center gap-1">
                            <Label className="text-sm whitespace-nowrap">Batches:</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`button-dec-batches-${comp.id}`}
                              onClick={() => updateComponentNumBatches(comp.id, (componentSettings[comp.id]?.numBatches ?? 1) - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center" data-testid={`text-batches-${comp.id}`}>
                              {componentSettings[comp.id]?.numBatches ?? 1}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`button-inc-batches-${comp.id}`}
                              onClick={() => updateComponentNumBatches(comp.id, (componentSettings[comp.id]?.numBatches ?? 1) + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>

                          {/* Parts per batch */}
                          <div className="flex items-center gap-1">
                            <Label className="text-sm whitespace-nowrap">Batch size:</Label>
                            <Input
                              type="number"
                              min="1"
                              className="w-20 h-8 text-sm"
                              data-testid={`input-batchsize-${comp.id}`}
                              value={componentSettings[comp.id]?.batchSize ?? 1}
                              onChange={(e) => updateComponentBatchSize(comp.id, Number(e.target.value))}
                            />
                          </div>

                          {/* Total parts indicator */}
                          <span className="text-xs text-gray-500">
                            = {(componentSettings[comp.id]?.numBatches ?? 1) * (componentSettings[comp.id]?.batchSize ?? 1)} parts
                          </span>

                          {/* Priority */}
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Priority:</Label>
                            <Select
                              value={componentSettings[comp.id]?.priority || 'medium'}
                              onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') =>
                                updateComponentPriority(comp.id, value)
                              }
                            >
                              <SelectTrigger className="w-28">
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
            {selectedTray ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <span className="font-medium">Selected tray:</span>
                <span>{trays.find(t => t.id === selectedTray)?.name || selectedTray}
                  {' '}({trays.find(t => t.id === selectedTray)?.width}×{trays.find(t => t.id === selectedTray)?.depth}mm)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <span>No tray selected — go to the <strong>Selection</strong> tab to pick one before running.</span>
              </div>
            )}
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
                  <p className="text-sm text-gray-600 mt-1">Minimum gap between adjacent components (0 = parts can touch)</p>
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
                  <p className="text-sm text-gray-600 mt-1">
                    Border clearance on all 4 tray edges (0 = parts can reach the edge).
                    {selectedTray && (() => {
                      const t = trays.find(tr => tr.id === selectedTray);
                      return t ? ` Usable area: ${t.width - 2 * edgeSpacing} × ${t.depth - 2 * edgeSpacing}mm` : '';
                    })()}
                  </p>
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

                <div className="border-t pt-4 space-y-3">
                  <Label className="font-semibold">Packing Mode</Label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="packingMode" value="precise"
                        checked={packingMode === 'precise'}
                        onChange={() => setPackingMode('precise')} />
                      <span className="text-sm">Precise (slower, optimal)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="packingMode" value="grid"
                        checked={packingMode === 'grid'}
                        onChange={() => setPackingMode('grid')} />
                      <span className="text-sm">Grid (fast, 1000s of parts)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="packingMode" value="diagonal"
                        checked={packingMode === 'diagonal'}
                        onChange={() => setPackingMode('diagonal')} />
                      <span className="text-sm">Diagonal 45° — S03 FB</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="packingMode" value="shelf"
                        checked={packingMode === 'shelf'}
                        onChange={() => setPackingMode('shelf')} />
                      <span className="text-sm">Batch Mix (tight shelf, randomised order)</span>
                    </label>
                  </div>

                  {packingMode === 'grid' && (
                    <div className="grid grid-cols-2 gap-4 pl-4">
                      <div>
                        <Label htmlFor="gridCols">Columns</Label>
                        <Input id="gridCols" type="number" value={gridColumns}
                          onChange={(e) => setGridColumns(Math.max(1, Number(e.target.value)))}
                          min="1" max="50" />
                      </div>
                      <div>
                        <Label htmlFor="gridRows">Rows</Label>
                        <Input id="gridRows" type="number" value={gridRows}
                          onChange={(e) => setGridRows(Math.max(1, Number(e.target.value)))}
                          min="1" max="50" />
                      </div>
                    </div>
                  )}

                  {packingMode === 'diagonal' && (
                    <div className="space-y-3 pl-4 border-l-2 border-indigo-200">
                      <p className="text-sm text-muted-foreground">
                        Parts are packed at the optimal angle (5°–85° from vertical) to
                        maximise how many fit per flight bar. The algorithm prefers shallower
                        angles and only tilts further when necessary to fit large parts.
                        Parts are never placed fully vertical. Parts are grouped into horizontal
                        flight bars.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="diagMin">Min parts per flight bar</Label>
                          <Input id="diagMin" type="number" value={diagonalMinPerBar}
                            onChange={(e) => setDiagonalMinPerBar(Math.max(1, Number(e.target.value)))}
                            min="1" max="10" />
                        </div>
                        <div>
                          <Label htmlFor="diagMax">Max parts per flight bar</Label>
                          <Input id="diagMax" type="number" value={diagonalMaxPerBar}
                            onChange={(e) => setDiagonalMaxPerBar(Math.max(diagonalMinPerBar, Number(e.target.value)))}
                            min="1" max="20" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="randomize"
                          checked={randomize}
                          onChange={(e) => setRandomize(e.target.checked)}
                          data-testid="checkbox-randomize"
                        />
                        <Label htmlFor="randomize" className="cursor-pointer">
                          Randomise part order (bars always fill to maximum)
                        </Label>
                      </div>
                    </div>
                  )}

                  {packingMode === 'shelf' && (
                    <div className="space-y-3 pl-4 border-l-2 border-emerald-200">
                      <p className="text-sm text-muted-foreground">
                        Parts are placed at their actual dimensions — no fixed grid cells,
                        no wasted cell padding. Parts are packed left-to-right in shelves;
                        a new shelf starts whenever the next part would overflow the width.
                        Enable randomise to shuffle batch order so different part types are
                        spread across trays rather than grouped by part number.
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="shelfRandomize"
                          checked={randomize}
                          onChange={(e) => setRandomize(e.target.checked)}
                          data-testid="checkbox-shelf-randomize"
                        />
                        <Label htmlFor="shelfRandomize" className="cursor-pointer">
                          Randomise batch order
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="shelfGridFill"
                          checked={shelfGridFill}
                          onChange={(e) => setShelfGridFill(e.target.checked)}
                          data-testid="checkbox-shelf-grid-fill"
                        />
                        <Label htmlFor="shelfGridFill" className="cursor-pointer">
                          Grid fill (snap parts to grid, overflow into neighbours OK)
                        </Label>
                      </div>
                      {shelfGridFill && (
                        <div className="grid grid-cols-2 gap-4 pl-4">
                          <div>
                            <Label htmlFor="shelfGridCols">Columns</Label>
                            <Input id="shelfGridCols" type="number" value={gridColumns}
                              onChange={(e) => setGridColumns(Math.max(1, Number(e.target.value)))}
                              min="1" max="50" />
                          </div>
                          <div>
                            <Label htmlFor="shelfGridRows">Rows</Label>
                            <Input id="shelfGridRows" type="number" value={gridRows}
                              onChange={(e) => setGridRows(Math.max(1, Number(e.target.value)))}
                              min="1" max="50" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {(() => {
                  const activeComponents = components.filter(c => (componentSettings[c.id]?.numBatches || 0) > 0);
                  const totalBatches = activeComponents.reduce((sum, c) => sum + (componentSettings[c.id]?.numBatches || 0), 0);
                  const totalParts   = activeComponents.reduce((sum, c) => sum + (componentSettings[c.id]?.numBatches || 0) * (componentSettings[c.id]?.batchSize || 1), 0);
                  return totalBatches > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      To pack: <strong>{totalBatches} {totalBatches === 1 ? 'batch' : 'batches'}</strong> ({totalParts.toLocaleString()} total parts, {activeComponents.length} unique types)
                    </p>
                  ) : null;
                })()}

                <Button
                  onClick={runOptimization}
                  disabled={!selectedTray || components.filter(comp => (componentSettings[comp.id]?.numBatches || 0) > 0).length === 0}
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
                <div className="grid md:grid-cols-5 gap-4">
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
                      <p className="text-gray-600">{packingMode === 'grid' ? 'Batches Placed' : 'Components Placed'}</p>
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
                  <Card>
                    <CardContent className="p-6 text-center">
                      <h3 className="font-semibold text-2xl text-orange-600">
                        {results.totalTraysUsed > 0
                          ? (results.totalComponentsPlaced / results.totalTraysUsed).toFixed(1)
                          : '—'}
                      </h3>
                      <p className="text-gray-600">Avg Parts / Tray</p>
                    </CardContent>
                  </Card>
                </div>

                {results.totalTraysUsed === 0 && (
                  <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 space-y-1">
                    <p className="font-semibold">Nothing could be placed on the tray.</p>
                    <p>This usually means one or more parts are too large for the selected tray given the current spacing settings. Try:</p>
                    <ul className="list-disc pl-5 space-y-0.5">
                      <li>Reducing <strong>Edge Spacing</strong> and/or <strong>Component Spacing</strong> in Settings (currently {edgeSpacing}mm edge, {spacing}mm between parts)</li>
                      <li>Switching to a larger tray in the Selection tab</li>
                      <li>Checking that your part dimensions (w × d) don't exceed the tray dimensions</li>
                    </ul>
                    <p className="text-xs text-red-600 mt-1">
                      Selected tray: {trays.find(t => t.id === selectedTray)?.name || selectedTray}
                      {' '}({trays.find(t => t.id === selectedTray)?.width} × {trays.find(t => t.id === selectedTray)?.depth}mm).
                      Usable area with current spacing: {(trays.find(t => t.id === selectedTray)?.width ?? 0) - 2 * edgeSpacing} × {(trays.find(t => t.id === selectedTray)?.depth ?? 0) - 2 * edgeSpacing}mm.
                    </p>
                  </div>
                )}

                {results.trayResults.map((trayResult) => (
                  <Card key={trayResult.trayNumber}>
                    <CardHeader>
                      <CardTitle>Tray {trayResult.trayNumber} — {trayResult.tray.name || trayResult.tray.id.split('_')[0]} ({trayResult.efficiency.toFixed(1)}% efficiency, {trayResult.placedComponents.length} components)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TrayVisualization result={trayResult} gridColumns={packingMode === 'grid' ? gridColumns : undefined} gridRows={packingMode === 'grid' ? gridRows : undefined} packingMode={packingMode} />
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
