import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FlightBarScheduler } from '../utils/schedulingAlgorithm';
import { SchedulerComponent, SchedulingResult } from '../types/scheduler';
import { Upload, Settings, BarChart3, Smartphone, Monitor } from 'lucide-react';
import ComponentUpload from './scheduler/ComponentUpload';
import ComponentConfiguration from './scheduler/ComponentConfiguration';
import SchedulingSettings from './scheduler/SchedulingSettings';
import SchedulingResults from './scheduler/SchedulingResults';

// Default data
const defaultComponents: SchedulerComponent[] = [
  {"id": "comp1", "w": 587, "d": 321, "k": "K32"},
  {"id": "comp2", "w": 912, "d": 75, "k": "K09"},
  {"id": "comp3", "w": 153, "d": 998, "k": "K18"},
  {"id": "comp4", "w": 432, "d": 604, "k": "K07"},
  {"id": "comp5", "w": 789, "d": 210, "k": "K14"},
  {"id": "comp6", "w": 864, "d": 512, "k": "K01"},
  {"id": "comp7", "w": 101, "d": 879, "k": "K06"},
  {"id": "comp8", "w": 654, "d": 234, "k": "K08"},
  {"id": "comp9", "w": 345, "d": 678, "k": "K10"},
  {"id": "comp10", "w": 789, "d": 543, "k": "K12"},
  {"id": "comp11", "w": 234, "d": 876, "k": "K15"},
  {"id": "comp12", "w": 567, "d": 321, "k": "K16"},
  {"id": "comp13", "w": 890, "d": 123, "k": "K17"},
  {"id": "comp14", "w": 432, "d": 765, "k": "K19"},
  {"id": "comp15", "w": 321, "d": 654, "k": "K22"},
  {"id": "comp16", "w": 876, "d": 234, "k": "K23"},
  {"id": "comp17", "w": 543, "d": 987, "k": "K24"},
  {"id": "comp18", "w": 210, "d": 345, "k": "K25"},
  {"id": "comp19", "w": 678, "d": 432, "k": "K28"},
  {"id": "comp20", "w": 987, "d": 210, "k": "K29"},
  {"id": "comp21", "w": 123, "d": 876, "k": "K31"},
  {"id": "comp22", "w": 654, "d": 543, "k": "K38"},
  {"id": "comp23", "w": 789, "d": 321, "k": "K01"},
  {"id": "comp24", "w": 345, "d": 654, "k": "K06"},
  {"id": "comp25", "w": 567, "d": 987, "k": "K07"},
  {"id": "comp26", "w": 210, "d": 432, "k": "K08"},
  {"id": "comp27", "w": 432, "d": 210, "k": "K09"},
  {"id": "comp28", "w": 876, "d": 543, "k": "K10"},
  {"id": "comp29", "w": 543, "d": 876, "k": "K12"},
  {"id": "comp30", "w": 321, "d": 789, "k": "K14"},
  {"id": "comp31", "w": 987, "d": 345, "k": "K15"},
  {"id": "comp32", "w": 654, "d": 567, "k": "K16"},
  {"id": "comp33", "w": 210, "d": 432, "k": "K17"},
  {"id": "comp34", "w": 876, "d": 210, "k": "K18"},
  {"id": "comp35", "w": 543, "d": 654, "k": "K19"},
  {"id": "comp36", "w": 321, "d": 987, "k": "K22"},
  {"id": "comp37", "w": 789, "d": 345, "k": "K23"},
  {"id": "comp38", "w": 432, "d": 567, "k": "K24"},
  {"id": "comp39", "w": 210, "d": 876, "k": "K25"},
  {"id": "comp40", "w": 654, "d": 543, "k": "K28"},
  {"id": "comp41", "w": 987, "d": 321, "k": "K29"},
  {"id": "comp42", "w": 345, "d": 789, "k": "K31"},
  {"id": "comp43", "w": 567, "d": 210, "k": "K32"},
  {"id": "comp44", "w": 210, "d": 432, "k": "K38"},
  {"id": "comp45", "w": 876, "d": 543, "k": "K01"},
  {"id": "comp46", "w": 543, "d": 876, "k": "K06"},
  {"id": "comp47", "w": 321, "d": 789, "k": "K07"},
  {"id": "comp48", "w": 987, "d": 345, "k": "K08"},
  {"id": "comp49", "w": 654, "d": 567, "k": "K09"},
  {"id": "comp50", "w": 210, "d": 432, "k": "K10"},
  {"id": "comp51", "w": 876, "d": 210, "k": "K12"},
  {"id": "comp52", "w": 543, "d": 654, "k": "K14"},
  {"id": "comp53", "w": 321, "d": 987, "k": "K15"},
  {"id": "comp54", "w": 789, "d": 345, "k": "K16"},
  {"id": "comp55", "w": 432, "d": 567, "k": "K17"},
  {"id": "comp56", "w": 210, "d": 876, "k": "K18"},
  {"id": "comp57", "w": 654, "d": 543, "k": "K19"},
  {"id": "comp58", "w": 987, "d": 321, "k": "K22"},
  {"id": "comp59", "w": 345, "d": 789, "k": "K23"},
  {"id": "comp60", "w": 567, "d": 210, "k": "K24"},
  {"id": "comp61", "w": 210, "d": 432, "k": "K25"},
  {"id": "comp62", "w": 876, "d": 543, "k": "K28"},
  {"id": "comp63", "w": 543, "d": 876, "k": "K29"},
  {"id": "comp64", "w": 321, "d": 789, "k": "K31"},
  {"id": "comp65", "w": 987, "d": 345, "k": "K32"},
  {"id": "comp66", "w": 654, "d": 567, "k": "K38"},
  {"id": "comp67", "w": 210, "d": 432, "k": "K01"},
  {"id": "comp68", "w": 876, "d": 210, "k": "K06"},
  {"id": "comp69", "w": 543, "d": 654, "k": "K07"},
  {"id": "comp70", "w": 321, "d": 987, "k": "K08"},
  {"id": "comp71", "w": 789, "d": 345, "k": "K09"},
  {"id": "comp72", "w": 432, "d": 567, "k": "K10"},
  {"id": "comp73", "w": 210, "d": 876, "k": "K12"},
  {"id": "comp74", "w": 654, "d": 543, "k": "K14"},
  {"id": "comp75", "w": 987, "d": 321, "k": "K15"},
  {"id": "comp76", "w": 345, "d": 789, "k": "K16"},
  {"id": "comp77", "w": 567, "d": 210, "k": "K17"},
  {"id": "comp78", "w": 210, "d": 432, "k": "K18"},
  {"id": "comp79", "w": 876, "d": 543, "k": "K19"},
  {"id": "comp80", "w": 543, "d": 876, "k": "K22"},
  {"id": "comp81", "w": 321, "d": 789, "k": "K23"},
  {"id": "comp82", "w": 987, "d": 345, "k": "K24"},
  {"id": "comp83", "w": 654, "d": 567, "k": "K25"},
  {"id": "comp84", "w": 210, "d": 432, "k": "K28"},
  {"id": "comp85", "w": 876, "d": 210, "k": "K29"},
  {"id": "comp86", "w": 543, "d": 789, "k": "K31"},
  {"id": "comp87", "w": 321, "d": 987, "k": "K32"},
  {"id": "comp88", "w": 789, "d": 345, "k": "K38"},
  {"id": "comp89", "w": 432, "d": 567, "k": "K01"},
  {"id": "comp90", "w": 210, "d": 876, "k": "K06"},
  {"id": "comp91", "w": 654, "d": 543, "k": "K07"},
  {"id": "comp92", "w": 987, "d": 321, "k": "K08"},
  {"id": "comp93", "w": 345, "d": 789, "k": "K09"},
  {"id": "comp94", "w": 567, "d": 210, "k": "K10"},
  {"id": "comp95", "w": 210, "d": 432, "k": "K12"},
  {"id": "comp96", "w": 876, "d": 543, "k": "K14"},
  {"id": "comp97", "w": 543, "d": 876, "k": "K15"},
  {"id": "comp98", "w": 321, "d": 789, "k": "K16"},
  {"id": "comp99", "w": 987, "d": 345, "k": "K17"},
  {"id": "comp100", "w": 654, "d": 567, "k": "K18"},
  {"id": "comp101", "w": 210, "d": 432, "k": "K19"},
  {"id": "comp102", "w": 876, "d": 210, "k": "K22"},
  {"id": "comp103", "w": 543, "d": 654, "k": "K23"},
  {"id": "comp104", "w": 321, "d": 987, "k": "K24"},
  {"id": "comp105", "w": 789, "d": 345, "k": "K25"},
  {"id": "comp106", "w": 432, "d": 567, "k": "K28"},
  {"id": "comp107", "w": 210, "d": 876, "k": "K29"},
  {"id": "comp108", "w": 654, "d": 543, "k": "K31"},
  {"id": "comp109", "w": 987, "d": 321, "k": "K32"},
  {"id": "comp110", "w": 345, "d": 789, "k": "K38"},
  {"id": "comp111", "w": 567, "d": 210, "k": "K01"},
  {"id": "comp112", "w": 210, "d": 432, "k": "K06"},
  {"id": "comp113", "w": 876, "d": 543, "k": "K07"},
  {"id": "comp114", "w": 543, "d": 876, "k": "K08"},
  {"id": "comp115", "w": 321, "d": 789, "k": "K09"},
  {"id": "comp116", "w": 987, "d": 345, "k": "K10"},
  {"id": "comp117", "w": 654, "d": 567, "k": "K12"},
  {"id": "comp118", "w": 210, "d": 432, "k": "K14"},
  {"id": "comp119", "w": 876, "d": 210, "k": "K15"},
  {"id": "comp120", "w": 543, "d": 654, "k": "K16"},
  {"id": "comp121", "w": 321, "d": 987, "k": "K17"},
  {"id": "comp122", "w": 789, "d": 345, "k": "K18"},
  {"id": "comp123", "w": 432, "d": 567, "k": "K19"},
  {"id": "comp124", "w": 210, "d": 876, "k": "K22"},
  {"id": "comp125", "w": 654, "d": 543, "k": "K23"},
  {"id": "comp126", "w": 987, "d": 321, "k": "K24"},
  {"id": "comp127", "w": 345, "d": 789, "k": "K25"},
  {"id": "comp128", "w": 567, "d": 210, "k": "K28"},
  {"id": "comp129", "w": 210, "d": 432, "k": "K29"},
  {"id": "comp130", "w": 876, "d": 543, "k": "K31"},
  {"id": "comp131", "w": 543, "d": 876, "k": "K32"},
  {"id": "comp132", "w": 321, "d": 789, "k": "K38"},
  {"id": "comp133", "w": 987, "d": 345, "k": "K01"},
  {"id": "comp134", "w": 654, "d": 567, "k": "K06"},
  {"id": "comp135", "w": 210, "d": 432, "k": "K07"},
  {"id": "comp136", "w": 876, "d": 210, "k": "K08"},
  {"id": "comp137", "w": 543, "d": 654, "k": "K09"},
  {"id": "comp138", "w": 321, "d": 987, "k": "K10"},
  {"id": "comp139", "w": 789, "d": 345, "k": "K12"},
  {"id": "comp140", "w": 432, "d": 567, "k": "K14"},
  {"id": "comp141", "w": 210, "d": 876, "k": "K15"},
  {"id": "comp142", "w": 654, "d": 543, "k": "K16"},
  {"id": "comp143", "w": 987, "d": 321, "k": "K17"},
  {"id": "comp144", "w": 345, "d": 789, "k": "K18"},
  {"id": "comp145", "w": 567, "d": 210, "k": "K19"},
  {"id": "comp146", "w": 210, "d": 432, "k": "K22"},
  {"id": "comp147", "w": 876, "d": 543, "k": "K23"},
  {"id": "comp148", "w": 543, "d": 876, "k": "K24"},
  {"id": "comp149", "w": 321, "d": 789, "k": "K25"},
  {"id": "comp150", "w": 987, "d": 345, "k": "K28"},
  {"id": "comp151", "w": 654, "d": 567, "k": "K29"},
  {"id": "comp152", "w": 210, "d": 432, "k": "K31"},
  {"id": "comp153", "w": 876, "d": 210, "k": "K32"},
  {"id": "comp154", "w": 543, "d": 654, "k": "K38"},
  {"id": "comp155", "w": 321, "d": 987, "k": "K01"},
  {"id": "comp156", "w": 789, "d": 345, "k": "K06"},
  {"id": "comp157", "w": 432, "d": 567, "k": "K07"},
  {"id": "comp158", "w": 210, "d": 876, "k": "K08"},
  {"id": "comp159", "w": 654, "d": 543, "k": "K09"},
  {"id": "comp160", "w": 987, "d": 321, "k": "K10"},
  {"id": "comp161", "w": 345, "d": 789, "k": "K12"},
  {"id": "comp162", "w": 567, "d": 210, "k": "K14"},
  {"id": "comp163", "w": 210, "d": 432, "k": "K15"},
  {"id": "comp164", "w": 876, "d": 543, "k": "K16"},
  {"id": "comp165", "w": 543, "d": 876, "k": "K17"},
  {"id": "comp166", "w": 321, "d": 789, "k": "K18"},
  {"id": "comp167", "w": 987, "d": 345, "k": "K19"},
  {"id": "comp168", "w": 654, "d": 567, "k": "K22"},
  {"id": "comp169", "w": 210, "d": 432, "k": "K23"},
  {"id": "comp170", "w": 876, "d": 210, "k": "K24"},
  {"id": "comp171", "w": 543, "d": 654, "k": "K25"},
  {"id": "comp172", "w": 321, "d": 987, "k": "K28"},
  {"id": "comp173", "w": 789, "d": 345, "k": "K29"},
  {"id": "comp174", "w": 432, "d": 567, "k": "K31"},
  {"id": "comp175", "w": 210, "d": 876, "k": "K32"},
  {"id": "comp176", "w": 654, "d": 543, "k": "K38"},
  {"id": "comp177", "w": 987, "d": 321, "k": "K01"},
  {"id": "comp178", "w": 345, "d": 789, "k": "K06"},
  {"id": "comp179", "w": 567, "d": 210, "k": "K07"},
  {"id": "comp180", "w": 210, "d": 432, "k": "K08"},
  {"id": "comp181", "w": 876, "d": 543, "k": "K09"},
  {"id": "comp182", "w": 543, "d": 876, "k": "K10"},
  {"id": "comp183", "w": 321, "d": 789, "k": "K12"},
  {"id": "comp184", "w": 987, "d": 345, "k": "K14"},
  {"id": "comp185", "w": 654, "d": 567, "k": "K15"},
  {"id": "comp186", "w": 210, "d": 432, "k": "K16"},
  {"id": "comp187", "w": 876, "d": 210, "k": "K17"},
  {"id": "comp188", "w": 543, "d": 654, "k": "K18"},
  {"id": "comp189", "w": 321, "d": 987, "k": "K19"},
  {"id": "comp190", "w": 789, "d": 345, "k": "K22"},
  {"id": "comp191", "w": 432, "d": 567, "k": "K23"},
  {"id": "comp192", "w": 210, "d": 876, "k": "K24"},
  {"id": "comp193", "w": 654, "d": 543, "k": "K25"},
  {"id": "comp194", "w": 987, "d": 321, "k": "K28"},
  {"id": "comp195", "w": 345, "d": 789, "k": "K29"},
  {"id": "comp196", "w": 567, "d": 210, "k": "K31"},
  {"id": "comp197", "w": 210, "d": 432, "k": "K32"},
  {"id": "comp198", "w": 876, "d": 543, "k": "K38"},
  {"id": "comp199", "w": 543, "d": 876, "k": "K01"},
  {"id": "comp200", "w": 321, "d": 789, "k": "K06"}
];

const FlightBarSchedulerComponent = () => {
  const [components, setComponents] = useState<SchedulerComponent[]>(defaultComponents);
  const [componentSettings, setComponentSettings] = useState<{[key: string]: {quantity: number, priority: 'low' | 'medium' | 'high' | 'critical'}}>(() => {
    const initialSettings: {[key: string]: {quantity: number, priority: 'low' | 'medium' | 'high' | 'critical'}} = {};
    defaultComponents.forEach(comp => {
      initialSettings[comp.id] = { quantity: 0, priority: 'medium' };
    });
    return initialSettings;
  });
  const [results, setResults] = useState<SchedulingResult | null>(null);
  const [spacing, setSpacing] = useState(100);
  const [edgeSpacing, setEdgeSpacing] = useState(100);
  const [allowRotation, setAllowRotation] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);

  const handleComponentsUpdate = (newComponents: SchedulerComponent[]) => {
    setComponents(newComponents);
    
    const initialSettings: {[key: string]: {quantity: number, priority: 'low' | 'medium' | 'high' | 'critical'}} = {};
    newComponents.forEach(comp => {
      initialSettings[comp.id] = { quantity: comp.quantity || 0, priority: comp.priority || 'medium' };
    });
    setComponentSettings(initialSettings);
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

  const runScheduling = () => {
    const selectedComponents = components
      .filter(comp => (componentSettings[comp.id]?.quantity || 0) > 0)
      .map(comp => ({
        ...comp,
        quantity: componentSettings[comp.id]?.quantity || 1,
        priority: componentSettings[comp.id]?.priority || 'medium'
      }));

    if (selectedComponents.length === 0) return;

    const scheduler = new FlightBarScheduler({
      spacing,
      edgeSpacing,
      allowRotation,
      optimizationLevel: 'balanced'
    });

    const result = scheduler.scheduleFlightBars(selectedComponents);
    setResults(result);
  };

  const canRunScheduling = components.filter(comp => (componentSettings[comp.id]?.quantity || 0) > 0).length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-4 md:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
            <div className="text-left">
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2 md:mb-4">
                Flight-bar mapping
              </h1>
              <p className="text-lg md:text-xl text-gray-600">
                Flight bar scheduling with K-number constraints and priority-based placement
              </p>
              <p className="text-base md:text-lg text-gray-500 mt-1 md:mt-2">
                Flight Bar Size: 3000mm × 1500mm
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsMobileView(!isMobileView)}
              className="flex items-center gap-2 shrink-0"
            >
              {isMobileView ? (
                <>
                  <Monitor className="w-4 h-4" />
                  Desktop View
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" />
                  Mobile View
                </>
              )}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="input" className="space-y-4 md:space-y-6">
          <TabsList className={`grid w-full ${isMobileView ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {!isMobileView && (
              <TabsTrigger value="input" className="flex items-center gap-2 text-xs md:text-sm">
                <Upload className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Input Data</span>
                <span className="sm:hidden">Input</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="settings" className="flex items-center gap-2 text-xs md:text-sm">
              <Settings className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Config</span>
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2 text-xs md:text-sm">
              <BarChart3 className="w-3 h-3 md:w-4 md:h-4" />
              Results
            </TabsTrigger>
          </TabsList>

          {!isMobileView && (
            <TabsContent value="input" className="space-y-4 md:space-y-6">
              <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                <ComponentUpload 
                  components={components}
                  onComponentsUpdate={handleComponentsUpdate}
                />
                <ComponentConfiguration
                  components={components}
                  componentSettings={componentSettings}
                  onUpdateQuantity={updateComponentQuantity}
                  onUpdatePriority={updateComponentPriority}
                />
              </div>
            </TabsContent>
          )}

          <TabsContent value="settings" className="space-y-4 md:space-y-6">
            <div className={isMobileView ? "space-y-4" : ""}>
              {isMobileView && (
                <ComponentConfiguration
                  components={components}
                  componentSettings={componentSettings}
                  onUpdateQuantity={updateComponentQuantity}
                  onUpdatePriority={updateComponentPriority}
                />
              )}
              <SchedulingSettings
                spacing={spacing}
                edgeSpacing={edgeSpacing}
                allowRotation={allowRotation}
                onSpacingChange={setSpacing}
                onEdgeSpacingChange={setEdgeSpacing}
                onAllowRotationChange={setAllowRotation}
                onRunScheduling={runScheduling}
                canRunScheduling={canRunScheduling}
              />
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-4 md:space-y-6">
            {results ? (
              <SchedulingResults results={results} />
            ) : (
              <Card>
                <CardContent className="p-6 md:p-12 text-center">
                  <p className="text-gray-600">Run scheduling to see results</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FlightBarSchedulerComponent;
