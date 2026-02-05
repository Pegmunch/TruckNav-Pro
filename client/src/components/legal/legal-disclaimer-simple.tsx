import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Navigation, Shield, Eye, Truck, CheckCircle2, Loader2 } from "lucide-react";
import { useLegalConsent } from "@/hooks/use-legal-consent";

interface LegalDisclaimerSimpleProps {
  onAccept?: () => Promise<void>;
}

/**
 * Simple Legal Disclaimer - Single Version
 * Shows ONLY at app startup, NEVER again after acceptance
 */
export default function LegalDisclaimerSimple({ onAccept }: LegalDisclaimerSimpleProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  
  const {
    setConsentAccepted,
    isLoading
  } = useLegalConsent();
  
  // Use parent's accept function if provided, otherwise use local hook
  const acceptFn = onAccept || setConsentAccepted;

  // Handle acceptance
  const handleAccept = async () => {
    setIsAccepting(true);
    
    try {
      await acceptFn();
      // Redirect to navigation page after accepting
      setLocation('/navigation');
    } catch (error) {
      console.error('[LEGAL] Failed to save consent:', error);
      setIsAccepting(false);
    }
  };

  if (isLoading || isAccepting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-4 sm:px-6 sm:py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Truck className="w-6 h-6 sm:w-8 sm:h-8" />
            <h1 className="text-xl sm:text-3xl font-bold">TruckNav Pro</h1>
          </div>
          <p className="text-sm sm:text-base text-blue-100">
            Professional Navigation for Heavy Goods Vehicles
          </p>
        </div>
      </div>

      {/* Content */}
      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-6 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Important Notice */}
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h2 className="text-base sm:text-lg font-bold text-red-900 dark:text-red-100">
                  Critical Safety Notice
                </h2>
                <p className="text-sm sm:text-base text-red-800 dark:text-red-200">
                  This navigation system is a supplementary aid only. You must verify all route information 
                  independently and obey all road signs, restrictions, and traffic laws.
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Disclaimer */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-blue-600" />
              <h3 className="text-base sm:text-lg font-semibold">Navigation Accuracy</h3>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Route calculations are estimates based on available data. Road conditions, restrictions, 
              and vehicle regulations may differ from system information. Always verify bridge heights, 
              weight limits, width restrictions, and routing before proceeding.
            </p>
          </div>

          {/* Liability Disclaimer */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h3 className="text-base sm:text-lg font-semibold">Limitation of Liability</h3>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              TruckNav Pro and Bespoke Marketing.Ai Ltd accept no liability for damages, fines, 
              accidents, or losses arising from use of this navigation system. This includes but is 
              not limited to property damage, personal injury, traffic violations, or commercial losses.
            </p>
          </div>

          {/* Driver Responsibility */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              <h3 className="text-base sm:text-lg font-semibold">Driver Responsibility</h3>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              You are solely responsible for safe vehicle operation, compliance with all traffic laws, 
              and verification of route suitability for your specific vehicle. Never operate this 
              system while driving. Pull over safely before making route changes.
            </p>
          </div>

          {/* ELD/Tachograph Compliance Notice */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-base sm:text-lg font-semibold">ELD & Tachograph Compliance</h3>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              <strong>Important:</strong> TruckNav Pro is NOT a certified Electronic Logging Device (ELD) 
              under FMCSA regulations, nor is it a certified digital tachograph. The Working Time Directive 
              warnings and Hours of Service tracking features are driver aids only and do NOT replace 
              official ELD devices, digital tachographs, or driver cards required by law. For legal 
              compliance, you must use certified equipment registered with the appropriate regulatory 
              authority (FMCSA, DVSA, or equivalent).
            </p>
          </div>

          {/* Data & Privacy */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h3 className="text-base sm:text-lg font-semibold">Data & Privacy</h3>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              This system collects location data to provide navigation services. Your data is 
              processed securely and used only for service delivery. We do not sell your personal 
              information to third parties.
            </p>
          </div>

          {/* Copyright & Ownership */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h3 className="text-base sm:text-lg font-semibold">Copyright & Ownership</h3>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              © 2024-2025 Bespoke Marketing.Ai Ltd. All rights reserved. TruckNav Pro™ is a 
              registered trademark. Unauthorized reproduction, distribution, or commercial use 
              is strictly prohibited.
            </p>
          </div>

          {/* Agreement Statement */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm sm:text-base text-blue-900 dark:text-blue-100 font-medium">
              By clicking "Accept &amp; Continue", you acknowledge that you have read, understood, 
              and agree to these terms and conditions. You accept full responsibility for safe 
              navigation and compliance with all applicable laws.
            </p>
          </div>
        </div>
      </ScrollArea>

      {/* Footer - Accept Button */}
      <div className="border-t bg-white dark:bg-gray-950 px-4 py-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <Button
            size="lg"
            className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold"
            onClick={handleAccept}
            disabled={isAccepting}
            data-testid="button-accept-legal"
          >
            {isAccepting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Accept &amp; Continue
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
