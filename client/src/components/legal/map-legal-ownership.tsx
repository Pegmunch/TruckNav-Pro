import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Copyright, FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import TermsOfService from "./terms-of-service";

interface MapLegalOwnershipProps {
  /** Additional CSS classes for the component */
  className?: string;
  /** Whether to show in compact mode (default: true) */
  compact?: boolean;
}

/**
 * Map Legal Ownership Component
 * 
 * A compact legal ownership notice designed to be positioned at the bottom right
 * corner of the map. Contains essential ownership information and legal protections
 * for TruckNav Pro while maintaining automotive design principles.
 * 
 * Features:
 * - Compact design optimized for map overlay
 * - Responsive layout for mobile and desktop
 * - Proper z-index stacking to avoid map control conflicts
 * - Click-through to full legal terms
 * - Maintains professional automotive styling
 * 
 * @param props - Component props
 * @returns JSX.Element - The compact legal ownership component
 */
export default function MapLegalOwnership({
  className,
  compact = true
}: MapLegalOwnershipProps) {
  
  return (
    <div 
      className={cn(
        // Base positioning - absolute positioned at map bottom right corner  
        "absolute bottom-4 right-4 z-20 pointer-events-none",
        // Background and styling - semi-transparent with border
        "bg-background border border-border rounded-lg shadow-lg",
        // Padding and spacing
        compact ? "px-3 py-2" : "px-4 py-3",
        // Ensure readable on any map background
        "text-foreground",
        // Responsive adjustments - max width for bottom right positioning
        "max-w-xs",
        // Automotive touch targets
        "automotive-legal-overlay",
        className
      )}
      data-testid="map-legal-ownership"
    >
      {compact ? (
        /* Compact Layout */
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          {/* Main Ownership Info */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Shield className="w-4 h-4 text-primary shrink-0" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0">
              <span className="font-semibold text-primary shrink-0">
                TruckNav Pro
              </span>
              <span className="text-muted-foreground truncate">
                © 2024-2025 Bespoke Marketing.Ai Ltd
              </span>
            </div>
          </div>
          
          {/* Protection Indicators & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Patent Protection Indicator */}
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300">
              <Shield className="w-3 h-3" />
              <span className="text-xs font-medium">PATENTED</span>
            </div>
            
            {/* Trademark Indicator */}
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded text-blue-700 dark:text-blue-300">
              <FileText className="w-3 h-3" />
              <span className="text-xs font-medium">™</span>
            </div>
            
            {/* View Full Terms Link */}
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-xs hover:bg-accent automotive-touch-target pointer-events-auto"
                  data-testid="button-view-legal-terms"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Legal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>TruckNav Pro - Legal Terms & Protections</DialogTitle>
                </DialogHeader>
                <div className="max-h-[80vh] overflow-y-auto">
                  <TermsOfService />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ) : (
        /* Expanded Layout */
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Legal Protections & Ownership</h3>
          </div>
          
          {/* Main Ownership */}
          <div className="text-center">
            <p className="text-sm font-semibold text-primary">
              TruckNav Pro is owned and operated by <strong>Bespoke Marketing.Ai Ltd</strong>
            </p>
          </div>
          
          {/* Legal Protections Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Copyright */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Copyright className="w-3 h-3 text-primary" />
                <h4 className="font-semibold">Copyright</h4>
              </div>
              <p className="text-muted-foreground">
                © 2024-2025 <strong>Bespoke Marketing.Ai Ltd</strong>
              </p>
            </div>
            
            {/* Patent */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Shield className="w-3 h-3 text-red-600" />
                <h4 className="font-semibold">Patent Protected</h4>
              </div>
              <p className="text-red-700 dark:text-red-400 font-medium">🛡️ PATENTED TECHNOLOGY</p>
            </div>
            
            {/* Trademark */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <FileText className="w-3 h-3 text-blue-600" />
                <h4 className="font-semibold">Trademark</h4>
              </div>
              <p className="text-blue-700 dark:text-blue-400 font-medium">™ PROTECTED MARKS</p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex justify-center">
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="automotive-touch-target"
                  data-testid="button-view-full-legal-terms"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Complete Terms
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Complete Legal Terms & Protections</DialogTitle>
                </DialogHeader>
                <div className="max-h-[80vh] overflow-y-auto">
                  <TermsOfService />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
    </div>
  );
}