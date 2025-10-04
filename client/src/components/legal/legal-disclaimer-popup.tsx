import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  AlertTriangle, 
  Navigation, 
  Shield, 
  Eye, 
  Truck, 
  MapPin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ScrollText,
  Scale,
  X,
  ExternalLink,
  FileText,
  CheckSquare
} from "lucide-react";
import { useLegalConsent, migrateOldConsentData } from "@/hooks/use-legal-consent";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface LegalDisclaimerPopupProps {
  // For popup window context
  onClose?: () => void;
}

export default function LegalDisclaimerPopup({ onClose }: LegalDisclaimerPopupProps) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState<1 | 2>(1);
  
  // Acknowledgement state
  const [acknowledgeNavigation, setAcknowledgeNavigation] = useState(false);
  const [acknowledgeLiability, setAcknowledgeLiability] = useState(false);
  const [acknowledgeResponsibility, setAcknowledgeResponsibility] = useState(false);
  const [acknowledgePrivacy, setAcknowledgePrivacy] = useState(false);
  const [acknowledgeTerms, setAcknowledgeTerms] = useState(false);
  const [acceptDisclaimer, setAcceptDisclaimer] = useState(false);
  
  // Decline handling state
  const [showDeclineWarning, setShowDeclineWarning] = useState(false);
  
  // Optimistic acceptance state
  const [isAccepting, setIsAccepting] = useState(false);

  // Use the centralized legal consent hook
  const {
    hasAcceptedTerms,
    setConsentAccepted,
    clearConsent,
    isLoading
  } = useLegalConsent();

  const canAccept = acknowledgeNavigation && acknowledgeLiability && acknowledgeResponsibility && acknowledgePrivacy && acknowledgeTerms && acceptDisclaimer;

  // Handle data migration from old format on component mount
  useEffect(() => {
    migrateOldConsentData();
  }, []);

  // Use hook's hasAcceptedTerms instead of localStorage directly
  const isAlreadyAccepted = hasAcceptedTerms;

  // If already accepted, don't render the overlay
  if (isAlreadyAccepted && !isLoading) {
    return null;
  }

  const handleAccept = () => {
    if (canAccept && !isAccepting) {
      // Optimistic UI update - show acceptance immediately
      setIsAccepting(true);
      
      // Use the centralized consent management hook - don't await, let it run in background
      // State updates happen synchronously, API call happens async in background
      setConsentAccepted({
        navigation: acknowledgeNavigation,
        liability: acknowledgeLiability,
        responsibility: acknowledgeResponsibility,
        privacy: acknowledgePrivacy,
        terms: acknowledgeTerms,
      }).catch((error) => {
        // Log API errors but don't block UI flow
        console.error('Failed to record consent on server:', error);
      });
      
      // Notify parent window immediately (optimistic)
      if (window.opener) {
        window.opener.postMessage({ type: 'legal_disclaimer_accepted' }, window.location.origin);
      }
      
      // Close immediately - state is already updated synchronously
      if (onClose) {
        onClose();
      }
    }
  };

  const handleDecline = () => {
    // Show inline warning instead of trying to close window
    setShowDeclineWarning(true);
  };
  
  const handleConfirmDecline = () => {
    // Clear consent and redirect to home
    clearConsent();
    
    if (window.opener) {
      window.opener.postMessage({ type: 'legal_disclaimer_declined' }, window.location.origin);
      window.close();
    } else if (onClose) {
      onClose();
    } else {
      // Redirect to home page with query param
      window.location.href = '/?declined=true';
    }
  };
  
  const handleCancelDecline = () => {
    // Go back to accepting terms
    setShowDeclineWarning(false);
  };

  const scrollToBottom = () => {
    const scrollContainer = document.querySelector('[data-testid="legal-scroll-area"]');
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Page navigation handlers
  const goToNextPage = () => {
    if (currentPage === 1) {
      setCurrentPage(2);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage === 2) {
      setCurrentPage(1);
    }
  };

  const goToPage = (page: 1 | 2) => {
    setCurrentPage(page);
  };

  // Helper function for "Accept All" checkboxes on page 2
  const handleAcceptAll = () => {
    setAcknowledgeNavigation(true);
    setAcknowledgeLiability(true);
    setAcknowledgeResponsibility(true);
    setAcknowledgePrivacy(true);
    setAcknowledgeTerms(true);
    setAcceptDisclaimer(true);
  };

  // Focus trap for accessibility - ESC key closes/declines the modal
  const containerRef = useFocusTrap<HTMLDivElement>({
    enabled: true,
    onEscape: showDeclineWarning ? handleCancelDecline : handleDecline,
    initialFocus: true,
    returnFocus: true,
  });

  return (
    <div 
      ref={containerRef}
      role="dialog"
      aria-labelledby="legal-disclaimer-title"
      aria-describedby="legal-disclaimer-description"
      aria-modal="true"
      className="fixed inset-0 z-[9999] min-h-screen bg-background text-foreground p-4 overflow-y-auto" 
      data-testid="legal-disclaimer-popup"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Scale className="w-8 h-8 text-red-600" />
          <div>
            <h1 id="legal-disclaimer-title" className="text-2xl font-bold">Legal Disclaimer</h1>
            <p id="legal-disclaimer-description" className="text-sm text-muted-foreground">TruckNav Pro Navigation Service</p>
          </div>
        </div>
        
        {/* Page Navigation and Close */}
        <div className="flex items-center gap-4">
          {/* Page Indicators */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant={currentPage === 1 ? "default" : "outline"}
              size="sm"
              onClick={() => goToPage(1)}
              className="h-9 px-2 sm:px-3 text-xs sm:text-sm min-w-0 sm:min-w-[100px]"
              data-testid="button-page-1"
            >
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Legal Terms</span>
            </Button>
            <Button
              variant={currentPage === 2 ? "default" : "outline"}
              size="sm"
              onClick={() => goToPage(2)}
              className="h-9 px-2 sm:px-3 text-xs sm:text-sm min-w-0 sm:min-w-[120px]"
              data-testid="button-page-2"
            >
              <CheckSquare className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Acknowledgments</span>
            </Button>
          </div>
          
          {/* Status and Close */}
          <div className="flex items-center gap-2">
            {isAlreadyAccepted && (
              <Badge variant="secondary" className="automotive-text-sm">
                Previously Accepted
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onClose || (() => window.close())}
              className="automotive-touch-target"
              data-testid="button-close-legal"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Page Progress Indicator */}
      <div className="flex items-center justify-center mb-4">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-8 rounded-full transition-colors ${
            currentPage === 1 ? 'bg-primary' : 'bg-muted'
          }`} data-testid="progress-page-1" />
          <div className={`h-2 w-8 rounded-full transition-colors ${
            currentPage === 2 ? 'bg-primary' : 'bg-muted'
          }`} data-testid="progress-page-2" />
        </div>
        <span className="ml-3 text-sm text-muted-foreground" data-testid="text-page-indicator">
          Page {currentPage} of 2
        </span>
      </div>

      {/* Content Area */}
      <div className="max-w-6xl mx-auto">
        {/* Page 1: Legal Terms and Disclaimers */}
        {currentPage === 1 && (
          <ScrollArea className="h-[calc(100vh-280px)] pr-4" data-testid="legal-scroll-area-page-1">
            <div className="space-y-6">
            
            {/* Critical Safety Warning */}
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-red-800 dark:text-red-200 text-lg mb-3">
                      ⚠️ CRITICAL SAFETY WARNING
                    </h3>
                    <p className="text-red-700 dark:text-red-300 automotive-text-base leading-relaxed mb-3">
                      <strong>NAVIGATION IS FOR GUIDANCE ONLY.</strong> You are solely responsible for safe driving, 
                      route verification, and compliance with all traffic laws and commercial vehicle regulations.
                    </p>
                    <p className="text-red-700 dark:text-red-300 automotive-text-base leading-relaxed">
                      <strong>DO NOT</strong> rely exclusively on this navigation system. Always verify routes with 
                      official sources, current road conditions, and applicable truck restrictions before traveling.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legal Disclaimers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Navigation Safety */}
              <Card className="border-amber-200 dark:border-amber-800">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200 automotive-text-lg">
                    <Navigation className="w-5 h-5" />
                    Navigation Safety Disclaimer
                  </CardTitle>
                </CardHeader>
                <CardContent className="automotive-text-sm space-y-3">
                  <p className="text-amber-700 dark:text-amber-300">
                    <strong>Route Accuracy:</strong> While we strive for accuracy, navigation data may contain errors, 
                    outdated information, or be affected by construction, weather, or road closures.
                  </p>
                  <p className="text-amber-700 dark:text-amber-300">
                    <strong>Driver Responsibility:</strong> You must maintain full attention to driving conditions, 
                    traffic laws, and vehicle operation at all times.
                  </p>
                  <p className="text-amber-700 dark:text-amber-300">
                    <strong>Commercial Vehicle Compliance:</strong> You are responsible for ensuring your vehicle 
                    complies with all applicable truck restrictions, weight limits, and height clearances.
                  </p>
                </CardContent>
              </Card>

              {/* Liability Limitations */}
              <Card className="border-blue-200 dark:border-blue-800">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200 automotive-text-lg">
                    <Shield className="w-5 h-5" />
                    Liability Limitations
                  </CardTitle>
                </CardHeader>
                <CardContent className="automotive-text-sm space-y-3">
                  <p className="text-blue-700 dark:text-blue-300">
                    <strong>No Warranty:</strong> TruckNav Pro is provided "as is" without warranties of any kind, 
                    express or implied, including but not limited to accuracy or fitness for purpose.
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    <strong>Limited Liability:</strong> We shall not be liable for any direct, indirect, incidental, 
                    or consequential damages arising from use of this service.
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    <strong>User Assumption of Risk:</strong> You acknowledge and accept all risks associated with 
                    commercial vehicle navigation and route planning.
                  </p>
                </CardContent>
              </Card>

              {/* Driver Responsibility */}
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200 automotive-text-lg">
                    <Truck className="w-5 h-5" />
                    Driver Responsibility
                  </CardTitle>
                </CardHeader>
                <CardContent className="automotive-text-sm space-y-3">
                  <p className="text-green-700 dark:text-green-300">
                    <strong>Professional Driving Standards:</strong> You must maintain professional commercial 
                    driver standards and comply with all applicable CDL requirements and regulations.
                  </p>
                  <p className="text-green-700 dark:text-green-300">
                    <strong>Route Verification:</strong> Always verify routes against official truck atlases, 
                    current restrictions, and local traffic authorities before proceeding.
                  </p>
                  <p className="text-green-700 dark:text-green-300">
                    <strong>Vehicle Safety:</strong> Ensure your vehicle is properly maintained, within weight 
                    and dimension limits, and compliant with all safety regulations.
                  </p>
                </CardContent>
              </Card>

              {/* Privacy and Data Usage */}
              <Card className="border-purple-200 dark:border-purple-800">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200 automotive-text-lg">
                    <Eye className="w-5 h-5" />
                    Privacy and Data Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="automotive-text-sm space-y-3">
                  <p className="text-purple-700 dark:text-purple-300">
                    <strong>Location Data:</strong> TruckNav Pro may collect location data to provide navigation 
                    services. This data is used solely for navigation and service improvement purposes.
                  </p>
                  <p className="text-purple-700 dark:text-purple-300">
                    <strong>Data Security:</strong> We implement reasonable security measures, but cannot guarantee 
                    absolute security of transmitted or stored data.
                  </p>
                  <p className="text-purple-700 dark:text-purple-300">
                    <strong>Third-Party Services:</strong> Our service may integrate with third-party mapping and 
                    traffic services, which have their own privacy policies and terms.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Terms and Service Agreement */}
            <Card className="border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 automotive-text-lg">
                  <ScrollText className="w-5 h-5" />
                  Terms of Service Agreement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="automotive-text-sm space-y-3">
                  <p>
                    <strong>Service Usage:</strong> TruckNav Pro is intended for commercial vehicle navigation 
                    and route planning. Misuse of the service or violation of these terms may result in 
                    service termination.
                  </p>
                  <p>
                    <strong>Intellectual Property:</strong> All software, interfaces, and navigation algorithms 
                    are proprietary to Bespoke Marketing.AI Ltd and protected by applicable intellectual 
                    property laws.
                  </p>
                  <p>
                    <strong>Service Availability:</strong> We strive to maintain service availability but 
                    cannot guarantee uninterrupted access. Service may be temporarily unavailable for 
                    maintenance or due to technical issues.
                  </p>
                  <p>
                    <strong>Updates and Changes:</strong> These terms may be updated periodically. Continued 
                    use of the service after changes constitutes acceptance of the revised terms.
                  </p>
                </div>
              </CardContent>
            </Card>
            </div>
          </ScrollArea>
        )}

        {/* Page 2: Required Acknowledgments */}
        {currentPage === 2 && (
          <ScrollArea className="h-[calc(100vh-280px)] pr-4" data-testid="legal-scroll-area-page-2">
            <div className="space-y-6">
              {/* Page 2 Header */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <CheckSquare className="w-8 h-8 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-bold text-primary text-lg mb-3">
                        ✓ Required Acknowledgments
                      </h3>
                      <p className="text-primary/80 automotive-text-base leading-relaxed mb-3">
                        <strong>IMPORTANT:</strong> Please review and acknowledge each statement below. 
                        All acknowledgments must be completed to proceed with TruckNav Pro.
                      </p>
                      <p className="text-primary/80 automotive-text-base leading-relaxed">
                        These acknowledgments confirm your understanding of the legal terms 
                        and your acceptance of responsibility when using our navigation service.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Acknowledgment Section */}
              <Card className="border-muted">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold automotive-text-lg">Individual Acknowledgments</h3>
                    <Button 
                      onClick={handleAcceptAll}
                      variant="outline"
                      size="sm"
                      className="automotive-touch-target"
                      data-testid="button-accept-all-checkboxes"
                    >
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Accept All
                    </Button>
                  </div>
                  
                  {/* Individual Acknowledgments */}
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/20">
                      <Checkbox 
                        id="acknowledge-navigation"
                        checked={acknowledgeNavigation}
                        onCheckedChange={(checked) => setAcknowledgeNavigation(checked === true)}
                        className="mt-1 automotive-touch-target"
                        data-testid="checkbox-acknowledge-navigation"
                      />
                      <label htmlFor="acknowledge-navigation" className="automotive-text-sm font-medium">
                        I acknowledge that navigation guidance is for reference only and I remain fully responsible for safe driving and route verification.
                      </label>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/20">
                      <Checkbox 
                        id="acknowledge-liability"
                        checked={acknowledgeLiability}
                        onCheckedChange={(checked) => setAcknowledgeLiability(checked === true)}
                        className="mt-1 automotive-touch-target"
                        data-testid="checkbox-acknowledge-liability"
                      />
                      <label htmlFor="acknowledge-liability" className="automotive-text-sm font-medium">
                        I understand and accept the liability limitations and that TruckNav Pro is provided without warranties.
                      </label>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/20">
                      <Checkbox 
                        id="acknowledge-responsibility"
                        checked={acknowledgeResponsibility}
                        onCheckedChange={(checked) => setAcknowledgeResponsibility(checked === true)}
                        className="mt-1 automotive-touch-target"
                        data-testid="checkbox-acknowledge-responsibility"
                      />
                      <label htmlFor="acknowledge-responsibility" className="automotive-text-sm font-medium">
                        I accept full responsibility for commercial vehicle compliance, route verification, and professional driving standards.
                      </label>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/20">
                      <Checkbox 
                        id="acknowledge-privacy"
                        checked={acknowledgePrivacy}
                        onCheckedChange={(checked) => setAcknowledgePrivacy(checked === true)}
                        className="mt-1 automotive-touch-target"
                        data-testid="checkbox-acknowledge-privacy"
                      />
                      <label htmlFor="acknowledge-privacy" className="automotive-text-sm font-medium">
                        I understand the privacy policy and consent to location data collection for navigation services.
                      </label>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/20">
                      <Checkbox 
                        id="acknowledge-terms"
                        checked={acknowledgeTerms}
                        onCheckedChange={(checked) => setAcknowledgeTerms(checked === true)}
                        className="mt-1 automotive-touch-target"
                        data-testid="checkbox-acknowledge-terms"
                      />
                      <label htmlFor="acknowledge-terms" className="automotive-text-sm font-medium">
                        I agree to the Terms of Service and understand that these terms may be updated periodically.
                      </label>
                    </div>

                    <Separator className="my-4" />

                    <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                      <Checkbox 
                        id="accept-disclaimer"
                        checked={acceptDisclaimer}
                        onCheckedChange={(checked) => setAcceptDisclaimer(checked === true)}
                        className="mt-1 automotive-touch-target"
                        data-testid="checkbox-accept-disclaimer"
                      />
                      <label htmlFor="accept-disclaimer" className="automotive-text-sm font-bold text-primary">
                        I accept all terms and disclaimers above and wish to proceed with using TruckNav Pro.
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        )}
        {/* Bottom Navigation and Action Buttons */}
        <div className="mt-6 space-y-4">
          {/* Page Navigation */}
          <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border">
            <Button 
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              variant="outline"
              className="automotive-button automotive-text-base"
              data-testid="button-previous-page"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            <div className="flex items-center gap-3">
              <span className="automotive-text-sm text-muted-foreground" data-testid="text-page-counter">
                {currentPage === 1 ? 'Legal Terms' : 'Acknowledgments'}
              </span>
            </div>
            
            <Button 
              onClick={goToNextPage}
              disabled={currentPage === 2}
              variant="outline"
              className="automotive-button automotive-text-base"
              data-testid="button-next-page"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Action Buttons - Show on both pages but different functionality */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleDecline}
              variant="outline"
              className="automotive-button automotive-text-base"
              data-testid="button-decline-legal"
            >
              Decline & Close
            </Button>
            
            {currentPage === 1 ? (
              <Button 
                onClick={scrollToBottom}
                variant="outline"
                className="automotive-button automotive-text-base"
                data-testid="button-scroll-bottom"
              >
                <ChevronDown className="w-4 h-4 mr-2" />
                Read All Terms
              </Button>
            ) : (
              <Button 
                onClick={handleAcceptAll}
                variant="outline"
                className="automotive-button automotive-text-base"
                data-testid="button-accept-all-page2"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Accept All
              </Button>
            )}
            
            <Button 
              onClick={currentPage === 1 ? goToNextPage : handleAccept}
              disabled={currentPage === 2 && !canAccept}
              className="automotive-button automotive-text-base flex-1 min-w-48"
              data-testid={currentPage === 1 ? "button-continue-to-acknowledgments" : "button-accept-legal"}
            >
              {currentPage === 1 ? (
                <>
                  Continue to Acknowledgments
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                `Accept & ${isAlreadyAccepted ? 'Close' : 'Enter TruckNav Pro'}`
              )}
            </Button>
          </div>

          {currentPage === 2 && (
            <p className="automotive-text-sm text-muted-foreground text-center mt-4">
              By clicking "Accept & Enter TruckNav Pro", you acknowledge reading and understanding all disclaimers.
            </p>
          )}
        </div>
      </div>
      
      {/* Decline Warning Overlay */}
      {showDeclineWarning && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="max-w-md mx-4 shadow-2xl border-red-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-6 h-6" />
                Terms Acceptance Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="automotive-text-base text-foreground">
                <strong>You must accept the legal terms to use TruckNav Pro.</strong>
              </p>
              <p className="automotive-text-sm text-muted-foreground">
                Our navigation service requires your acknowledgment of the safety disclaimers and legal terms. 
                Without acceptance, we cannot provide navigation services.
              </p>
              <Separator />
              <div className="space-y-3">
                <p className="automotive-text-sm font-medium">What would you like to do?</p>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleCancelDecline}
                    className="automotive-button automotive-text-base w-full"
                    data-testid="button-cancel-decline"
                  >
                    Review Terms Again
                  </Button>
                  <Button
                    onClick={handleConfirmDecline}
                    variant="outline"
                    className="automotive-button automotive-text-base w-full text-red-600 border-red-300 hover:bg-red-50"
                    data-testid="button-confirm-decline"
                  >
                    Exit Without Accepting
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}