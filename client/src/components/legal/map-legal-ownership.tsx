import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Copyright, FileText, ExternalLink, HelpCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';
import TermsOfService from "./terms-of-service";
import UserGuide from "@/components/guide/user-guide";

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
  const { t } = useTranslation();
  const [guideOpen, setGuideOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [showCeo, setShowCeo] = useState(false);
  
  return (
    <div 
      className={cn(
        // Base positioning - fixed at bottom left corner, above map attribution
        "fixed bottom-6 left-0 z-[200] pointer-events-none",
        // Padding and spacing - thinner for PWA mode
        compact ? "px-3 py-1" : "px-4 py-3",
        // Solid white background with rounded corners
        "bg-white/95 backdrop-blur-sm rounded-r-lg",
        // Ensure readable on any map background
        "text-foreground",
        // Responsive adjustments - max width for bottom positioning
        "max-w-xs",
        // Automotive touch targets
        "automotive-legal-overlay",
        className
      )}
      data-testid="map-legal-ownership"
    >
      {compact ? (
        /* Compact Layout - Centered */
        <div className="flex flex-row items-center justify-center gap-3 text-xs">
          {/* Main Ownership Info */}
          <div className="flex items-center gap-2 cursor-pointer pointer-events-auto" onClick={() => setShowCeo(prev => !prev)}>
            <span className="text-muted-foreground">
              Owned and made by Bespoke Marketing LTD @ Trucknavpro.com
            </span>
            {showCeo ? (
              <span className="text-[9px] text-muted-foreground transition-opacity duration-500 select-none">CEO Mr C Berry</span>
            ) : (
              <span className="text-[0px] leading-[0] overflow-hidden opacity-0 pointer-events-none select-none" aria-hidden="true">CEO Mr C Berry</span>
            )}
          </div>
          
          {/* User Guide Button */}
          <div className="flex items-center gap-1 shrink-0">
            <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 px-2 text-xs bg-white hover:bg-gray-100 border border-gray-300 shadow-sm automotive-touch-target pointer-events-auto"
                  data-testid="button-view-user-guide"
                >
                  <HelpCircle className="w-3 h-3 mr-1" />
                  {t('common.guide', 'Guide')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] bg-white">
                <DialogHeader className="flex flex-row items-center justify-between">
                  <DialogTitle>{t('userGuide.title', 'TruckNav Pro User Guide')}</DialogTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setGuideOpen(false)}
                    className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </DialogHeader>
                <UserGuide />
              </DialogContent>
            </Dialog>
            
            {/* Legal Button */}
            <Dialog open={legalOpen} onOpenChange={setLegalOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 px-2 text-xs bg-white hover:bg-gray-100 border border-gray-300 shadow-sm automotive-touch-target pointer-events-auto"
                  data-testid="button-view-legal-terms"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  {t('common.legal', 'Legal')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] bg-white">
                <DialogHeader className="flex flex-row items-center justify-between">
                  <DialogTitle>{t('legal.termsTitle', 'TruckNav Pro - Legal Terms & Protections')}</DialogTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLegalOpen(false)}
                    className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </DialogHeader>
                <div className="max-h-[80vh] overflow-y-auto bg-white">
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
          <div className="text-center cursor-pointer" onClick={() => setShowCeo(prev => !prev)}>
            <p className="text-sm font-semibold text-primary">
              TruckNav Pro is owned and operated by <strong>Bespoke Marketing. Ai Ltd</strong>
            </p>
            {showCeo ? (
              <p className="text-[9px] text-muted-foreground transition-opacity duration-500 select-none mt-0.5">CEO Mr C Berry</p>
            ) : (
              <span className="text-[0px] leading-[0] overflow-hidden opacity-0 pointer-events-none select-none" aria-hidden="true">CEO Mr C Berry</span>
            )}
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
                © 2024-2025 <strong>Bespoke Marketing. Ai Ltd</strong>
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