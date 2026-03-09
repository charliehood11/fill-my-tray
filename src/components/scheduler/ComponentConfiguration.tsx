
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SchedulerComponent } from '../../types/scheduler';
import { Plus, Minus, QrCode, Barcode, Camera, X, SwitchCamera } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';

interface ComponentConfigurationProps {
  components: SchedulerComponent[];
  componentSettings: {[key: string]: {quantity: number, priority: 'low' | 'medium' | 'high' | 'critical'}};
  onUpdateQuantity: (componentId: string, quantity: number) => void;
  onUpdatePriority: (componentId: string, priority: 'low' | 'medium' | 'high' | 'critical') => void;
}

const ComponentConfiguration: React.FC<ComponentConfigurationProps> = ({
  components,
  componentSettings,
  onUpdateQuantity,
  onUpdatePriority
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [lastScannedComponent, setLastScannedComponent] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const handleQuantityChange = (componentId: string, value: string) => {
    const quantity = parseInt(value) || 0;
    if (quantity >= 0) {
      onUpdateQuantity(componentId, quantity);
    }
  };

  const processScannedCode = (code: string) => {
    console.log('Processing scanned code:', code);
    const matchedComponent = components.find(comp => 
      comp.id === code.trim() ||
      comp.name === code.trim() ||
      comp.k === code.trim()
    );

    if (matchedComponent) {
      console.log('Matched component:', matchedComponent.id);
      const currentQuantity = componentSettings[matchedComponent.id]?.quantity || 0;
      console.log('Current quantity:', currentQuantity);
      const newQuantity = currentQuantity + 1;
      console.log('New quantity:', newQuantity);
      
      onUpdateQuantity(matchedComponent.id, newQuantity);
      setLastScannedComponent(matchedComponent.id);
      setScanError(null);
      
      // Clear the highlight after 2 seconds
      setTimeout(() => setLastScannedComponent(null), 2000);
    } else {
      setScanError(`No component found for code: ${code}`);
      setTimeout(() => setScanError(null), 3000);
    }
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    processScannedCode(scanInput);
    setScanInput('');
  };

  const startCameraScanning = async () => {
    try {
      setScanError(null);
      setIsCameraMode(true);
      
      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader();
      }

      const videoInputDevices = await codeReaderRef.current.listVideoInputDevices();
      setAvailableCameras(videoInputDevices);
      
      if (videoInputDevices.length === 0) {
        setScanError('No camera devices found');
        setIsCameraMode(false);
        return;
      }

      // Use the selected camera or fallback to first available
      const selectedDeviceId = videoInputDevices[currentCameraIndex]?.deviceId || videoInputDevices[0].deviceId;
      
      await codeReaderRef.current.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current!,
        (result, err) => {
          if (result) {
            processScannedCode(result.getText());
          }
          if (err && err.name !== 'NotFoundException') {
            console.log('Scanning error:', err);
          }
        }
      );
    } catch (error) {
      console.error('Camera scanning error:', error);
      setScanError('Failed to access camera. Please check permissions.');
      setIsCameraMode(false);
    }
  };

  const switchCamera = async () => {
    if (availableCameras.length <= 1) return;
    
    const nextCameraIndex = (currentCameraIndex + 1) % availableCameras.length;
    setCurrentCameraIndex(nextCameraIndex);
    
    // Stop current camera and restart with new one
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    
    // Small delay to ensure camera is properly released
    setTimeout(async () => {
      if (isCameraMode) {
        await startCameraScanning();
      }
    }, 100);
  };

  const stopCameraScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setIsCameraMode(false);
  };

  const toggleScanning = () => {
    if (isScanning) {
      setIsScanning(false);
      setIsCameraMode(false);
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
      setScanInput('');
      setLastScannedComponent(null);
      setScanError(null);
    } else {
      setIsScanning(true);
    }
  };

  useEffect(() => {
    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Configure Components</CardTitle>
          <Button
            variant={isScanning ? "destructive" : "outline"}
            onClick={toggleScanning}
            className="flex items-center gap-2"
          >
            {isScanning ? (
              <>Stop Scanning</>
            ) : (
              <>
                <QrCode className="w-4 h-4" />
                <Barcode className="w-4 h-4" />
                Start Scanning
              </>
            )}
          </Button>
        </div>
        
        {isScanning && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg space-y-4">
            <div className="flex gap-2">
              <Button
                variant={isCameraMode ? "default" : "outline"}
                onClick={startCameraScanning}
                className="flex items-center gap-2"
                disabled={isCameraMode}
              >
                <Camera className="w-4 h-4" />
                Use Camera
              </Button>
              {isCameraMode && (
                <>
                  <Button
                    variant="outline"
                    onClick={stopCameraScanning}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Stop Camera
                  </Button>
                  {availableCameras.length > 1 && (
                    <Button
                      variant="outline"
                      onClick={switchCamera}
                      className="flex items-center gap-2"
                    >
                      <SwitchCamera className="w-4 h-4" />
                      Flip Camera
                    </Button>
                  )}
                </>
              )}
            </div>

            {isCameraMode && (
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full max-w-md h-48 bg-black rounded-lg"
                  autoPlay
                  playsInline
                />
                <div className="absolute inset-0 border-2 border-red-500 border-dashed rounded-lg pointer-events-none opacity-50"></div>
                {availableCameras.length > 1 && (
                  <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    Camera {currentCameraIndex + 1} of {availableCameras.length}
                  </div>
                )}
              </div>
            )}

            {!isCameraMode && (
              <form onSubmit={handleScanSubmit} className="flex gap-2">
                <Input
                  placeholder="Scan barcode/QR code or enter component ID, name, or K-number"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button type="submit">Add</Button>
              </form>
            )}

            {scanError && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {scanError}
              </div>
            )}

            <p className="text-sm text-blue-600">
              {isCameraMode 
                ? "Point your camera at a barcode or QR code to scan automatically."
                : "Use camera to scan or manually enter a component ID, name, or K-number to add one to its quantity."
              }
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {components.map(comp => (
            <div 
              key={comp.id} 
              className={`p-3 border rounded-lg space-y-3 transition-colors ${
                lastScannedComponent === comp.id ? 'bg-green-50 border-green-300' : ''
              }`}
            >
              <div className="font-medium flex items-center gap-2">
                {comp.name || comp.id} ({comp.w}×{comp.d}mm)
                <Badge variant="outline" className="text-xs">K: {comp.k}</Badge>
                {lastScannedComponent === comp.id && (
                  <Badge className="bg-green-500 text-white text-xs">Just Scanned!</Badge>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Quantity:</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateQuantity(comp.id, Math.max(0, (componentSettings[comp.id]?.quantity || 0) - 1))}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    value={componentSettings[comp.id]?.quantity || 0}
                    onChange={(e) => handleQuantityChange(comp.id, e.target.value)}
                    className="w-16 text-center"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateQuantity(comp.id, (componentSettings[comp.id]?.quantity || 0) + 1)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Priority:</Label>
                  <Select
                    value={componentSettings[comp.id]?.priority || 'medium'}
                    onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => 
                      onUpdatePriority(comp.id, value)
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
  );
};

export default ComponentConfiguration;
