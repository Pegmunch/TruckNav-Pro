import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLegalConsent } from "@/hooks/use-legal-consent";
import TermsOfService from "./terms-of-service";

interface LegalDisclaimerDialogProps {
  /** Controls the visibility of the dialog */
  open: boolean;
  /** Callback fired when the dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Additional CSS classes for the dialog */
  className?: string;
}

/**
 * Legal Disclaimer Dialog Component
 * 
 * A full-screen mobile dialog that displays the TruckNav Pro terms of service
 * and legal disclaimers. Only accessible after user has completed the consent
 * agreement checkboxes.
 * 
 * Features:
 * - Full-screen on mobile devices with responsive design
 * - Integrates existing TermsOfService content
 * - Access control via useLegalConsent hook
 * - Mobile-first design with proper touch targets
 * - Comprehensive accessibility support
 * 
 * @param props - Component props
 * @returns JSX.Element - The legal disclaimer dialog
 */
export default function LegalDisclaimerDialog({
  open,
  onOpenChange,
  className
}: LegalDisclaimerDialogProps) {
  const { hasAcceptedTerms, isLoading } = useLegalConsent();

  /**
   * Handle dialog close action
   */
  const handleClose = () => {
    onOpenChange(false);
  };

  /**
   * Handle keyboard navigation for accessibility
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // Full-screen mobile, large desktop modal
          "sm:max-w-4xl w-full h-[100dvh] sm:h-auto",
          // Remove default padding for custom layout
          "p-0",
          // Ensure proper z-index and positioning
          "z-50",
          // Mobile optimization
          "sm:max-h-[90vh]",
          // Custom styling
          "bg-background border-0 sm:border",
          className
        )}
        data-testid="dialog-legal-disclaimer"
        onKeyDown={handleKeyDown}
        // Disable default close button to use custom one
        aria-labelledby="legal-disclaimer-title"
        aria-describedby="legal-disclaimer-description"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 sm:px-6">
          <DialogHeader className="flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <DialogTitle 
                id="legal-disclaimer-title"
                className="text-lg font-semibold"
                data-testid="text-dialog-title"
              >
                Legal Terms & Disclaimers
              </DialogTitle>
            </div>
            
            {/* Custom Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-9 w-9 p-0 rounded-full hover:bg-accent focus:ring-2 focus:ring-ring focus:ring-offset-2"
              data-testid="button-close-dialog"
              aria-label="Close legal disclaimer dialog"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogHeader>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-4 py-6 sm:px-6" id="legal-disclaimer-description">
              {/* Access Control Check */}
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3 text-muted-foreground">Loading...</span>
                </div>
              ) : !hasAcceptedTerms ? (
                /* Warning for Unauthorized Access */
                <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
                  <CardContent className="pt-6">
                    <Alert>
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <AlertDescription className="text-amber-800 dark:text-amber-200">
                        <div className="space-y-3">
                          <p className="font-medium">
                            Access Restricted - Consent Required
                          </p>
                          <p className="text-sm">
                            You must first complete the legal consent agreement to access 
                            the full terms and disclaimers. Please return to the main 
                            application and complete all required agreement checkboxes.
                          </p>
                          <div className="mt-4">
                            <Button
                              onClick={handleClose}
                              variant="outline"
                              size="sm"
                              className="text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                              data-testid="button-return-to-consent"
                            >
                              Return to Complete Consent
                            </Button>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              ) : (
                /* Main Content - Terms of Service */
                <div 
                  className="space-y-4"
                  role="article"
                  aria-label="TruckNav Pro Legal Terms and Disclaimers"
                >
                  {/* Introduction */}
                  <div className="mb-6">
                    <Alert className="border-primary/20 bg-primary/5">
                      <Shield className="h-4 w-4 text-primary" />
                      <AlertDescription className="text-sm">
                        <p className="font-medium mb-2">
                          Complete Legal Documentation
                        </p>
                        <p>
                          This dialog contains the complete terms of service, disclaimers, 
                          and legal protections for TruckNav Pro. You have access to this 
                          content because you have completed the required consent agreement.
                        </p>
                      </AlertDescription>
                    </Alert>
                  </div>

                  {/* Terms of Service Content */}
                  <div 
                    className="legal-content-container"
                    data-testid="container-terms-content"
                  >
                    <TermsOfService />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer with Close Action */}
        <div className="sticky bottom-0 bg-background border-t border-border px-4 py-3 sm:px-6">
          <div className="flex justify-end">
            <Button
              onClick={handleClose}
              variant="outline"
              className="min-w-[120px]"
              data-testid="button-close-footer"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Export type definitions for external usage
 */
export type { LegalDisclaimerDialogProps };