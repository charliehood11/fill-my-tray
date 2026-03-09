
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ProcessSchedulingComponent from '../components/ProcessScheduling';
import { Package, Plane, Clock } from 'lucide-react';

const ProcessScheduling = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100">
      {/* Navigation Header */}
      <div className="p-6 border-b bg-white/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Optimization Suite</h1>
          <div className="flex gap-4">
            <Button variant="outline" asChild>
              <Link to="/" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Tray Packing
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/scheduler" className="flex items-center gap-2">
                <Plane className="w-4 h-4" />
                Flight Bar Scheduler
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/process-scheduling" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Process Scheduling
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <ProcessSchedulingComponent />
    </div>
  );
};

export default ProcessScheduling;
