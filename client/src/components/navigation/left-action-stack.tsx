import { AlertCircle, Menu, Navigation, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LeftActionStackProps {
  onNavigate?: () => void;
  onReportIncident?: () => void;
  onCancel?: () => void;
  onOpenMenu?: () => void;
  isNavigating: boolean;
}

export function LeftActionStack({
  onNavigate,
  onReportIncident,
  onCancel,
  onOpenMenu,
  isNavigating
}: LeftActionStackProps) {
  // Defensive check - ensures component can't be rendered outside navigation mode
  if (!isNavigating) return null;
  
  return (
    <>
      {/* Navigation button - red navigation arrow */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          console.log('[LEFT-BTN-1-NAV] ✅ Navigation arrow button clicked');
          onNavigate?.();
        }}
        className="h-9 w-9 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg"
        data-testid="button-nav-left"
      >
        <Navigation className="h-4 w-4" />
      </Button>

      {/* Incident report button - orange */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          console.log('[LEFT-BTN-2-INCIDENT] ✅ Report Incident button clicked - Opening dialog');
          onReportIncident?.();
        }}
        className="h-9 w-9 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
        data-testid="button-report-incident"
      >
        <AlertCircle className="h-4 w-4" />
      </Button>

      {/* Cancel navigation button - red X */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          console.log('[LEFT-BTN-3-CANCEL] ✅ Cancel Navigation button clicked - Stopping navigation');
          onCancel?.();
        }}
        className="h-9 w-9 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg"
        data-testid="button-cancel-nav"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Menu button - blue hamburger at bottom */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          console.log('[LEFT-BTN-4-MENU] ✅ Menu button clicked - Opening comprehensive menu');
          onOpenMenu?.();
        }}
        className="h-9 w-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg mt-8"
        data-testid="button-menu"
      >
        <Menu className="h-4 w-4" />
      </Button>
    </>
  );
}
