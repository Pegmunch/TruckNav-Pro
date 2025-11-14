import { AlertCircle, Navigation, X } from 'lucide-react';
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
  if (!isNavigating) return null;

  return (
    <>
      {/* Navigation button - red navigation arrow */}
      <Button
        variant="ghost"
        size="lg"
        onClick={onNavigate}
        className="h-14 w-14 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg"
        data-testid="button-nav-left"
      >
        <Navigation className="h-6 w-6" />
      </Button>

      {/* Incident report button - orange */}
      <Button
        variant="ghost"
        size="lg"
        onClick={onReportIncident}
        className="h-14 w-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
        data-testid="button-report-incident"
      >
        <AlertCircle className="h-6 w-6" />
      </Button>

      {/* Cancel navigation button - red X */}
      <Button
        variant="ghost"
        size="lg"
        onClick={onCancel}
        className="h-14 w-14 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg"
        data-testid="button-cancel-nav"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Menu button - purple square at bottom */}
      <Button
        variant="ghost"
        size="lg"
        onClick={onOpenMenu}
        className="h-14 w-14 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg mt-8"
        data-testid="button-menu"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <rect x="6" y="6" width="12" height="12" strokeWidth={2} />
        </svg>
      </Button>
    </>
  );
}