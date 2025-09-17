import { useState } from "react";
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
  ScrollText,
  Scale,
  X,
  ExternalLink
} from "lucide-react";

interface LegalDisclaimerPopupProps {
  // For popup window context
  onClose?: () => void;
}

export default function LegalDisclaimerPopup({ onClose }: LegalDisclaimerPopupProps) {
  const [acknowledgeNavigation, setAcknowledgeNavigation] = useState(false);
  const [acknowledgeLiability, setAcknowledgeLiability] = useState(false);
  const [acknowledgeResponsibility, setAcknowledgeResponsibility] = useState(false);
  const [acknowledgePrivacy, setAcknowledgePrivacy] = useState(false);
  const [acknowledgeTerms, setAcknowledgeTerms] = useState(false);
  const [acceptDisclaimer, setAcceptDisclaimer] = useState(false);

  const canAccept = acknowledgeNavigation && acknowledgeLiability && acknowledgeResponsibility && acknowledgePrivacy && acknowledgeTerms && acceptDisclaimer;

  // Check if already accepted
  const hasAcceptedDisclaimer = localStorage.getItem('trucknav_disclaimer_accepted');
  let isAlreadyAccepted = false;
  if (hasAcceptedDisclaimer) {
    try {
      const disclaimerData = JSON.parse(hasAcceptedDisclaimer);
      isAlreadyAccepted = disclaimerData.accepted && disclaimerData.timestamp;
    } catch {
      // Invalid data
    }
  }

  const handleAccept = () => {
    if (canAccept) {
      localStorage.setItem('trucknav_disclaimer_accepted', JSON.stringify({
        accepted: true,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }));
      
      // Notify parent window or close
      if (window.opener) {
        window.opener.postMessage({ type: 'legal_disclaimer_accepted' }, window.location.origin);
      }
      
      if (onClose) {
        onClose();
      } else {
        window.close();
      }
    }
  };

  const handleDecline = () => {
    localStorage.removeItem('trucknav_disclaimer_accepted');
    
    if (window.opener) {
      window.opener.postMessage({ type: 'legal_disclaimer_declined' }, window.location.origin);
    }
    
    if (onClose) {
      onClose();
    } else {
      window.close();
    }
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

  return (
    <div className="min-h-screen bg-background text-foreground p-4" data-testid="legal-disclaimer-popup">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Scale className="w-8 h-8 text-red-600" />
          <div>
            <h1 className="text-2xl font-bold">Legal Disclaimer</h1>
            <p className="text-sm text-muted-foreground">TruckNav Pro Navigation Service</p>
          </div>
        </div>
        
        {/* Close button for popup */}
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

      {/* Content Area */}
      <div className="max-w-6xl mx-auto">
        <ScrollArea className="h-[calc(100vh-200px)] pr-4" data-testid="legal-scroll-area">
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

        {/* Acknowledgment Section */}
        <div className="mt-8 space-y-4 p-6 bg-muted/30 rounded-lg border">
          <h3 className="font-bold automotive-text-lg mb-4">Required Acknowledgments</h3>
          
          {/* Individual Acknowledgments */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
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

            <div className="flex items-start space-x-3">
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

            <div className="flex items-start space-x-3">
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

            <div className="flex items-start space-x-3">
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

            <div className="flex items-start space-x-3">
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

            <div className="flex items-start space-x-3">
              <Checkbox 
                id="accept-disclaimer"
                checked={acceptDisclaimer}
                onCheckedChange={(checked) => setAcceptDisclaimer(checked === true)}
                className="mt-1 automotive-touch-target"
                data-testid="checkbox-accept-disclaimer"
              />
              <label htmlFor="accept-disclaimer" className="automotive-text-sm font-bold">
                I accept all terms and disclaimers above and wish to proceed with using TruckNav Pro.
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button 
              onClick={handleDecline}
              variant="outline"
              className="automotive-button automotive-text-base"
              data-testid="button-decline-legal"
            >
              Decline & Close
            </Button>
            
            <Button 
              onClick={canAccept ? scrollToBottom : undefined}
              variant="outline"
              className="automotive-button automotive-text-base"
              data-testid="button-scroll-bottom"
            >
              <ChevronDown className="w-4 h-4 mr-2" />
              Read All Terms
            </Button>
            
            <Button 
              onClick={handleAccept}
              disabled={!canAccept}
              className="automotive-button automotive-text-base flex-1 min-w-48"
              data-testid="button-accept-legal"
            >
              Accept & {isAlreadyAccepted ? 'Close' : 'Enter TruckNav Pro'}
            </Button>
          </div>

          <p className="automotive-text-sm text-muted-foreground text-center mt-4">
            By clicking "Accept & Enter TruckNav Pro", you acknowledge reading and understanding all disclaimers above.
          </p>
        </div>
      </div>
    </div>
  );
}