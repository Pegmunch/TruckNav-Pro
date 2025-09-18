import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Music, X } from 'lucide-react';
import EntertainmentPanel from '@/components/entertainment/entertainment-panel';

export default function EntertainmentWindow() {
  useEffect(() => {
    document.title = 'TruckNav Pro - Entertainment';
  }, []);

  const handleCloseWindow = () => {
    window.close();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Window Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Music className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Entertainment</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCloseWindow}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="max-w-4xl">
        <EntertainmentPanel
          isOpen={true}
          onClose={() => {}}
        />
      </div>
    </div>
  );
}