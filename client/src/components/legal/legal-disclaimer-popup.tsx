import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
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
  CheckSquare,
  CheckCircle2,
  ArrowDown,
  Zap,
  CheckCheck
} from "lucide-react";
import { useLegalConsent, migrateOldConsentData } from "@/hooks/use-legal-consent";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface LegalDisclaimerPopupProps {
  // For popup window context
  onClose?: () => void;
}

export default function LegalDisclaimerPopup({ onClose }: LegalDisclaimerPopupProps) {
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Pagination state (only for desktop)
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

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle scroll progress for mobile
  useEffect(() => {
    if (!isMobile || !scrollRef.current) return;
    
    const handleScroll = () => {
      const element = scrollRef.current;
      if (!element) return;
      
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      const progress = (scrollTop / scrollHeight) * 100;
      
      setScrollProgress(Math.min(progress, 100));
      
      // Hide scroll indicator when near bottom
      if (progress > 90) {
        setShowScrollIndicator(false);
      }
    };
    
    const element = scrollRef.current;
    element?.addEventListener('scroll', handleScroll);
    
    return () => element?.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  // Handle data migration from old format on component mount
  useEffect(() => {
    migrateOldConsentData();
  }, []);

  // Use hook's hasAcceptedTerms instead of localStorage directly
  const isAlreadyAccepted = hasAcceptedTerms;

  // Quick accept all handler
  const handleQuickAcceptAll = () => {
    // Set all checkboxes to true
    setAcknowledgeNavigation(true);
    setAcknowledgeLiability(true);
    setAcknowledgeResponsibility(true);
    setAcknowledgePrivacy(true);
    setAcknowledgeTerms(true);
    setAcceptDisclaimer(true);
    
    // Small delay to show the checkboxes being checked
    setTimeout(() => {
      handleAccept();
    }, 300);
  };

  const handleAccept = () => {
    if (!isAccepting) {
      // Allow acceptance if quick accept was used OR all checkboxes are checked
      const allChecked = acknowledgeNavigation && acknowledgeLiability && 
                        acknowledgeResponsibility && acknowledgePrivacy && 
                        acknowledgeTerms && acceptDisclaimer;
      
      if (!allChecked) return;
      
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

  // Helper function for "Accept All" checkboxes
  const handleAcceptAllCheckboxes = () => {
    setAcknowledgeNavigation(true);
    setAcknowledgeLiability(true);
    setAcknowledgeResponsibility(true);
    setAcknowledgePrivacy(true);
    setAcknowledgeTerms(true);
    setAcceptDisclaimer(true);
  };

  // Page navigation handlers (desktop only)
  const goToPage = (page: 1 | 2) => {
    if (!isMobile) {
      setCurrentPage(page);
    }
  };

  // Focus trap for accessibility - ESC key closes/declines the modal
  const containerRef = useFocusTrap<HTMLDivElement>({
    enabled: true,
    onEscape: showDeclineWarning ? handleCancelDecline : handleDecline,
    initialFocus: true,
    returnFocus: true,
  });

  // If already accepted, don't render the overlay (after all hooks)
  if (isAlreadyAccepted && !isLoading) {
    return null;
  }

  // Checkbox row component for mobile optimization
  const CheckboxRow = ({ 
    id, 
    checked, 
    onChange, 
    label, 
    testId 
  }: { 
    id: string; 
    checked: boolean; 
    onChange: (checked: boolean) => void; 
    label: string;
    testId: string;
  }) => (
    <div 
      className={cn(
        "flex items-start space-x-3 p-3 sm:p-3 rounded-lg border bg-muted/20",
        "cursor-pointer hover:bg-muted/30 transition-colors",
        // Mobile optimizations
        isMobile && "p-4 active:bg-muted/40"
      )}
      onClick={() => onChange(!checked)}
    >
      <Checkbox 
        id={id}
        checked={checked}
        onCheckedChange={(checked) => onChange(checked === true)}
        className={cn(
          "mt-1",
          // Larger touch target on mobile
          isMobile ? "h-6 w-6 min-h-[44px] min-w-[44px]" : "automotive-touch-target"
        )}
        data-testid={testId}
        onClick={(e) => e.stopPropagation()}
      />
      <label 
        htmlFor={id} 
        className={cn(
          "font-medium cursor-pointer select-none",
          isMobile ? "text-sm leading-relaxed" : "automotive-text-sm"
        )}
      >
        {label}
      </label>
    </div>
  );

  return (
    // Outer wrapper: Isolated stacking context at z-9999
    <div className="fixed inset-0 z-[9999] isolate">
      {/* Backdrop layer: Semi-transparent overlay to block underlying content */}
      <div className="absolute inset-0 bg-black/70 dark:bg-black/80" aria-hidden="true" />
      
      {/* Content container: Fully opaque panel with focus trap */}
      <div 
        ref={containerRef}
        role="dialog"
        aria-labelledby="legal-disclaimer-title"
        aria-describedby="legal-disclaimer-description"
        aria-modal="true"
        className="relative flex flex-col h-full min-h-[100vh] sm:h-dvh bg-white dark:bg-gray-950 text-foreground" 
        data-testid="legal-disclaimer-popup"
      >
        {/* Header - Simplified on mobile */}
        <div className={cn(
          "flex items-center justify-between p-4 border-b bg-white dark:bg-gray-950",
          isMobile && "p-3"
        )}>
          {/* Title Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Scale className={cn(
              "text-red-600 flex-shrink-0",
              isMobile ? "w-5 h-5" : "w-6 h-6 sm:w-8 sm:h-8"
            )} />
            <div>
              <h1 id="legal-disclaimer-title" className={cn(
                "font-bold",
                isMobile ? "text-base" : "text-lg sm:text-2xl"
              )}>
                Legal Disclaimer
              </h1>
              {!isMobile && (
                <p id="legal-disclaimer-description" className="text-xs sm:text-sm text-muted-foreground">
                  TruckNav Pro Navigation Service
                </p>
              )}
            </div>
          </div>
          
          {/* Desktop Page Navigation or Mobile Progress */}
          {!isMobile ? (
            // Desktop: Page navigation buttons
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant={currentPage === 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(1)}
                  className="h-11 px-3 text-xs min-w-[90px] sm:min-w-[100px]"
                  data-testid="button-page-1"
                >
                  <FileText className="w-4 h-4 mr-1 sm:mr-2" />
                  <span>Terms</span>
                </Button>
                <Button
                  variant={currentPage === 2 ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(2)}
                  className="h-11 px-3 text-xs min-w-[90px] sm:min-w-[100px]"
                  data-testid="button-page-2"
                >
                  <CheckSquare className="w-4 h-4 mr-1 sm:mr-2" />
                  <span>Accept</span>
                </Button>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onClose || (() => window.close())}
                className="h-11 w-11 flex-shrink-0"
                data-testid="button-close-legal"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            // Mobile: Progress indicator and close button
            <div className="flex items-center gap-2">
              {scrollProgress > 0 && (
                <div className="w-20">
                  <Progress value={scrollProgress} className="h-2" />
                </div>
              )}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onClose || (() => window.close())}
                className="h-10 w-10 flex-shrink-0"
                data-testid="button-close-legal"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>

        {/* Content Area - Mobile: single scrollable page, Desktop: paginated */}
        <div 
          ref={scrollRef}
          className={cn(
            "flex-1 overflow-y-auto bg-white dark:bg-gray-950",
            isMobile ? "px-3 py-3" : "px-4 py-4",
            // Add padding bottom for sticky footer on mobile
            isMobile && "pb-32"
          )}
          data-testid="legal-scroll-area"
        >
          {/* Mobile: Show all content in single page */}
          {isMobile ? (
            <div className="space-y-4">
              {/* Critical Safety Warning */}
              <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-red-800 dark:text-red-200 text-base mb-2">
                        ⚠️ CRITICAL SAFETY WARNING
                      </h3>
                      <p className="text-red-700 dark:text-red-300 text-sm leading-relaxed">
                        <strong>NAVIGATION IS FOR GUIDANCE ONLY.</strong> You are solely responsible for safe driving and compliance with all traffic laws.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compact Legal Sections for Mobile */}
              <div className="space-y-3">
                {/* Navigation Safety */}
                <Card className="border-amber-200 dark:border-amber-800">
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200 text-base">
                      <Navigation className="w-4 h-4" />
                      Navigation Safety
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2 pb-4">
                    <p className="text-amber-700 dark:text-amber-300">
                      Routes may contain errors or be outdated. Always verify routes and maintain full attention to driving conditions.
                    </p>
                  </CardContent>
                </Card>

                {/* Liability */}
                <Card className="border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200 text-base">
                      <Shield className="w-4 h-4" />
                      Liability Limitations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2 pb-4">
                    <p className="text-blue-700 dark:text-blue-300">
                      Service provided "as is" without warranties. We are not liable for any damages arising from use.
                    </p>
                  </CardContent>
                </Card>

                {/* Driver Responsibility */}
                <Card className="border-green-200 dark:border-green-800">
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200 text-base">
                      <Truck className="w-4 h-4" />
                      Driver Responsibility
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2 pb-4">
                    <p className="text-green-700 dark:text-green-300">
                      Maintain professional standards, verify routes, ensure vehicle compliance with all regulations.
                    </p>
                  </CardContent>
                </Card>

                {/* Privacy */}
                <Card className="border-purple-200 dark:border-purple-800">
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200 text-base">
                      <Eye className="w-4 h-4" />
                      Privacy & Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2 pb-4">
                    <p className="text-purple-700 dark:text-purple-300">
                      Location data collected for navigation only. Third-party services have their own privacy policies.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Acknowledgments Section */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-base">Required Acknowledgments</h3>
                    <Button 
                      onClick={handleAcceptAllCheckboxes}
                      variant="outline"
                      size="sm"
                      className="h-10 px-3 text-xs"
                      data-testid="button-accept-all-checkboxes"
                    >
                      <CheckSquare className="w-4 h-4 mr-1" />
                      Check All
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <CheckboxRow
                      id="acknowledge-navigation"
                      checked={acknowledgeNavigation}
                      onChange={setAcknowledgeNavigation}
                      label="I acknowledge that navigation guidance is for reference only."
                      testId="checkbox-acknowledge-navigation"
                    />
                    
                    <CheckboxRow
                      id="acknowledge-liability"
                      checked={acknowledgeLiability}
                      onChange={setAcknowledgeLiability}
                      label="I understand and accept the liability limitations."
                      testId="checkbox-acknowledge-liability"
                    />
                    
                    <CheckboxRow
                      id="acknowledge-responsibility"
                      checked={acknowledgeResponsibility}
                      onChange={setAcknowledgeResponsibility}
                      label="I accept full responsibility for vehicle compliance."
                      testId="checkbox-acknowledge-responsibility"
                    />
                    
                    <CheckboxRow
                      id="acknowledge-privacy"
                      checked={acknowledgePrivacy}
                      onChange={setAcknowledgePrivacy}
                      label="I consent to location data collection for navigation."
                      testId="checkbox-acknowledge-privacy"
                    />
                    
                    <CheckboxRow
                      id="acknowledge-terms"
                      checked={acknowledgeTerms}
                      onChange={setAcknowledgeTerms}
                      label="I agree to the Terms of Service."
                      testId="checkbox-acknowledge-terms"
                    />
                    
                    <Separator className="my-2" />
                    
                    <CheckboxRow
                      id="accept-disclaimer"
                      checked={acceptDisclaimer}
                      onChange={setAcceptDisclaimer}
                      label="I have read and accept all legal disclaimers."
                      testId="checkbox-accept-disclaimer"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            // Desktop: Two-page system
            <>
              {/* Page 1: Legal Terms and Disclaimers */}
              {currentPage === 1 && (
                <div className="space-y-4 pb-4" data-testid="legal-scroll-area-page-1">
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
                </div>
              )}

              {/* Page 2: Required Acknowledgments */}
              {currentPage === 2 && (
                <div className="space-y-4 pb-4" data-testid="legal-scroll-area-page-2">
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
                            onClick={handleAcceptAllCheckboxes}
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
                          <CheckboxRow
                            id="acknowledge-navigation-desktop"
                            checked={acknowledgeNavigation}
                            onChange={setAcknowledgeNavigation}
                            label="I acknowledge that navigation guidance is for reference only and I remain fully responsible for safe driving and route verification."
                            testId="checkbox-acknowledge-navigation"
                          />

                          <CheckboxRow
                            id="acknowledge-liability-desktop"
                            checked={acknowledgeLiability}
                            onChange={setAcknowledgeLiability}
                            label="I understand and accept the liability limitations and that TruckNav Pro is provided without warranties."
                            testId="checkbox-acknowledge-liability"
                          />

                          <CheckboxRow
                            id="acknowledge-responsibility-desktop"
                            checked={acknowledgeResponsibility}
                            onChange={setAcknowledgeResponsibility}
                            label="I accept full responsibility for commercial vehicle compliance, route verification, and professional driving standards."
                            testId="checkbox-acknowledge-responsibility"
                          />

                          <CheckboxRow
                            id="acknowledge-privacy-desktop"
                            checked={acknowledgePrivacy}
                            onChange={setAcknowledgePrivacy}
                            label="I understand the privacy policy and consent to location data collection for navigation services."
                            testId="checkbox-acknowledge-privacy"
                          />

                          <CheckboxRow
                            id="acknowledge-terms-desktop"
                            checked={acknowledgeTerms}
                            onChange={setAcknowledgeTerms}
                            label="I agree to the Terms of Service and understand that these terms may be updated periodically."
                            testId="checkbox-acknowledge-terms"
                          />

                          <Separator className="my-4" />

                          <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                            <Checkbox 
                              id="accept-disclaimer-desktop"
                              checked={acceptDisclaimer}
                              onCheckedChange={(checked) => setAcceptDisclaimer(checked === true)}
                              className="mt-1 automotive-touch-target"
                              data-testid="checkbox-accept-disclaimer"
                            />
                            <label htmlFor="accept-disclaimer-desktop" className="automotive-text-sm font-bold text-primary">
                              ✓ I have read, understood, and accept all legal disclaimers and terms of service for TruckNav Pro.
                            </label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mobile Scroll Indicator */}
        {isMobile && showScrollIndicator && scrollProgress < 90 && (
          <div 
            className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none animate-bounce-down"
            data-testid="scroll-indicator"
          >
            <div className="bg-primary/90 text-primary-foreground rounded-full p-3 shadow-lg">
              <ArrowDown className="w-5 h-5" />
            </div>
          </div>
        )}

        {/* Footer Actions - Mobile: sticky, Desktop: normal */}
        <div className={cn(
          "border-t bg-white dark:bg-gray-950",
          isMobile ? "fixed bottom-0 left-0 right-0 p-3 space-y-2 shadow-2xl z-20" : "p-6"
        )}>
          {/* Mobile: Quick Accept Button (Always visible) */}
          {isMobile && (
            <>
              <Button 
                onClick={handleQuickAcceptAll}
                size="lg"
                className={cn(
                  "w-full h-14 text-base font-bold",
                  "bg-green-600 hover:bg-green-700 text-white",
                  "animate-pulse-green shadow-lg",
                  "transition-all duration-300",
                  isAccepting && "opacity-50"
                )}
                disabled={isAccepting}
                data-testid="button-quick-accept-all"
              >
                <Zap className="w-5 h-5 mr-2" />
                I understand the risks - Accept All & Continue
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleDecline}
                  variant="outline"
                  size="lg"
                  className="flex-1 h-12"
                  disabled={isAccepting}
                  data-testid="button-decline"
                >
                  Decline
                </Button>
                <Button 
                  onClick={handleAccept}
                  size="lg"
                  disabled={!canAccept || isAccepting}
                  className={cn(
                    "flex-1 h-12",
                    canAccept && "bg-primary"
                  )}
                  data-testid="button-accept"
                >
                  {canAccept ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Accept
                    </>
                  ) : (
                    "Select All Above"
                  )}
                </Button>
              </div>
            </>
          )}
          
          {/* Desktop: Traditional buttons */}
          {!isMobile && (
            <div className="flex justify-between">
              {/* Decline Warning or Normal Actions */}
              {showDeclineWarning ? (
                <Card className="w-full border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-red-800 dark:text-red-200 mb-2">
                          Are you sure you want to decline?
                        </h4>
                        <p className="text-red-700 dark:text-red-300 text-sm">
                          Declining these terms means you cannot use TruckNav Pro navigation service. 
                          You will be redirected to the home page.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button 
                        onClick={handleCancelDecline}
                        variant="outline"
                        data-testid="button-cancel-decline"
                      >
                        Go Back
                      </Button>
                      <Button 
                        onClick={handleConfirmDecline}
                        variant="destructive"
                        data-testid="button-confirm-decline"
                      >
                        Yes, Decline and Exit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleDecline}
                      variant="outline"
                      size="lg"
                      disabled={isAccepting}
                      data-testid="button-decline"
                    >
                      Decline
                    </Button>
                  </div>
                  
                  <div className="flex gap-3 items-center">
                    {/* Quick Accept for Desktop */}
                    <Button 
                      onClick={handleQuickAcceptAll}
                      size="lg"
                      variant="secondary"
                      className={cn(
                        "font-bold",
                        isAccepting && "opacity-50"
                      )}
                      disabled={isAccepting}
                      data-testid="button-quick-accept-desktop"
                    >
                      <CheckCheck className="w-5 h-5 mr-2" />
                      Quick Accept All
                    </Button>
                    
                    <Button 
                      onClick={handleAccept}
                      size="lg"
                      disabled={!canAccept || isAccepting}
                      className={cn(
                        "min-w-[150px]",
                        canAccept ? "animate-pulse" : ""
                      )}
                      data-testid="button-accept"
                    >
                      {isAccepting ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 mr-2 animate-spin" />
                          Accepting...
                        </>
                      ) : canAccept ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                          Accept and Continue
                        </>
                      ) : currentPage === 1 ? (
                        "Continue to Acknowledgments"
                      ) : (
                        "Complete All Checkboxes"
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}