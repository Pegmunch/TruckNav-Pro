import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { History, X } from 'lucide-react';
import HistoryFavoritesPanel from '@/components/navigation/history-favorites-panel';
import { useQuery } from '@tanstack/react-query';
import type { Route } from '@shared/schema';

export default function HistoryWindow() {
  const { data: currentRoute = null } = useQuery<Route | null>({ queryKey: ['/api/routes/current'] });

  useEffect(() => {
    document.title = 'TruckNav Pro - History & Favorites';
  }, []);

  const handleCloseWindow = () => {
    window.close();
  };

  const handleLocationChange = (location: string, type: 'from' | 'to') => {
    console.log(`Location changed: ${type} = ${location}`);
  };

  const handleStartNavigation = () => {
    console.log('Starting navigation from history window');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Window Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <History className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">History & Favorites</h1>
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
        <HistoryFavoritesPanel
          isOpen={true}
          onClose={() => {}}
          onFromLocationChange={(value) => handleLocationChange(value, 'from')}
          onToLocationChange={(value) => handleLocationChange(value, 'to')}
          onStartNavigation={handleStartNavigation}
          currentRoute={currentRoute}
        />
      </div>
    </div>
  );
}