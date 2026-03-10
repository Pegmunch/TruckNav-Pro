import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, X } from 'lucide-react';
import { ThemeSelector } from '@/components/theme/theme-selector';

export default function ThemesWindow() {
  useEffect(() => {
    document.title = 'TruckNav Pro - Themes';
  }, []);

  const handleCloseWindow = () => {
    window.close();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Window Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Eye className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Themes & Color Palette</h1>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2 text-primary" />
              Theme & Color Palette
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium text-foreground mb-4 block">
                Choose Your Theme
              </label>
              <ThemeSelector 
                size="default"
                showLabels={true}
                showGrayscale={true}
                showColorSpectrum={true}
                showAutoSettings={true}
                showAutoStatus={true}
                className="w-full"
              />
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p>💡 Theme changes apply immediately across all TruckNav Pro windows and are saved automatically.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}