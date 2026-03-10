import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Scale
} from "lucide-react";

interface LegalDisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function LegalDisclaimerModal({ isOpen, onAccept, onDecline }: LegalDisclaimerModalProps) {
  const [acknowledgeNavigation, setAcknowledgeNavigation] = useState(false);
  const [acknowledgeLiability, setAcknowledgeLiability] = useState(false);
  const [acknowledgeResponsibility, setAcknowledgeResponsibility] = useState(false);
  const [acknowledgePrivacy, setAcknowledgePrivacy] = useState(false);
  const [acknowledgeTerms, setAcknowledgeTerms] = useState(false);
  const [acceptDisclaimer, setAcceptDisclaimer] = useState(false);

  const canAccept = acknowledgeNavigation && acknowledgeLiability && acknowledgeResponsibility && acknowledgePrivacy && acknowledgeTerms && acceptDisclaimer;

  const handleAccept = () => {
    if (canAccept) {
      localStorage.setItem('trucknav_disclaimer_accepted', JSON.stringify({
        accepted: true,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }));
      onAccept();
    }
  };

  const handleDecline = () => {
    localStorage.removeItem('trucknav_disclaimer_accepted');
    onDecline();
  };

  const scrollToBottom = () => {
    const dialogContent = document.querySelector('[data-testid="dialog-legal-disclaimer"] [data-radix-dialog-content]');
    if (dialogContent) {
      dialogContent.scrollTo({
        top: dialogContent.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="w-[95vw] max-w-5xl h-[95vh] max-h-[95vh] flex flex-col p-4 overflow-y-auto scroll-smooth" 
        data-testid="dialog-legal-disclaimer"
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl md:text-2xl">
            <Scale className="w-6 h-6 text-red-600" />
            Legal Disclaimer - TruckNav Pro Navigation Service
          </DialogTitle>
          <DialogDescription className="text-sm">
            Important safety warnings and liability disclaimers that must be acknowledged before using our truck navigation service.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 pr-4 overflow-y-auto scroll-smooth" style={{maxHeight: 'calc(100% - 300px)'}}>
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
                    <p className="text-red-700 dark:text-red-300 text-sm leading-relaxed mb-3">
                      <strong>NAVIGATION IS FOR GUIDANCE ONLY.</strong> You are solely responsible for safe driving, 
                      route verification, and compliance with all traffic laws and commercial vehicle regulations.
                    </p>
                    <p className="text-red-700 dark:text-red-300 text-sm leading-relaxed">
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
                  <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <Navigation className="w-5 h-5" />
                    Navigation Safety Disclaimer
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  <p className="text-amber-700 dark:text-amber-300">
                    <strong>Route Accuracy:</strong> While we strive for accuracy, navigation data may contain errors, 
                    outdated information, or be affected by construction, weather, or road closures.
                  </p>
                  <p className="text-amber-700 dark:text-amber-300">
                    <strong>Driver Responsibility:</strong> You must maintain full attention to driving conditions, 
                    traffic laws, and vehicle operation at all times.
                  </p>
                  <p className="text-amber-700 dark:text-amber-300">
                    <strong>Emergency Situations:</strong> This system is not designed for emergency navigation. 
                    Contact emergency services directly when needed.
                  </p>
                </CardContent>
              </Card>

              {/* Truck-Specific Warnings */}
              <Card className="border-blue-200 dark:border-blue-800">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                    <Truck className="w-5 h-5" />
                    Commercial Vehicle Warnings
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  <p className="text-blue-700 dark:text-blue-300">
                    <strong>Height/Weight Restrictions:</strong> Always verify bridge clearances, weight limits, 
                    and truck restrictions independently before travel.
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    <strong>Permit Requirements:</strong> Ensure you have all required permits for oversized loads, 
                    hazardous materials, or restricted routes.
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    <strong>Local Regulations:</strong> Commercial vehicle laws vary by location. Verify compliance 
                    with local, state, and federal regulations.
                  </p>
                </CardContent>
              </Card>

              {/* Limitation of Liability */}
              <Card className="border-purple-200 dark:border-purple-800">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
                    <Shield className="w-5 h-5" />
                    Limitation of Liability
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  <p className="text-purple-700 dark:text-purple-300">
                    <strong>No Warranties:</strong> TruckNav Pro is provided "as is" without warranties of accuracy, 
                    completeness, or fitness for any particular purpose.
                  </p>
                  <p className="text-purple-700 dark:text-purple-300">
                    <strong>Damage Exclusion:</strong> We are not liable for any damages, including accidents, 
                    delays, property damage, or losses resulting from navigation use.
                  </p>
                  <p className="text-purple-700 dark:text-purple-300">
                    <strong>Third-Party Data:</strong> Some navigation data comes from third parties. 
                    We cannot guarantee its accuracy or completeness.
                  </p>
                </CardContent>
              </Card>

              {/* Privacy & Data Usage */}
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                    <Eye className="w-5 h-5" />
                    Privacy & Data Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  <p className="text-green-700 dark:text-green-300">
                    <strong>Location Data:</strong> We collect GPS location data to provide navigation services. 
                    This data may be stored and used for service improvement.
                  </p>
                  <p className="text-green-700 dark:text-green-300">
                    <strong>Usage Analytics:</strong> Anonymous usage data helps us improve routing algorithms 
                    and service quality for all users.
                  </p>
                  <p className="text-green-700 dark:text-green-300">
                    <strong>Data Security:</strong> We implement security measures, but cannot guarantee 
                    absolute protection against unauthorized access.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Terms of Service Summary */}
            <Card className="border-gray-300 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <ScrollText className="w-5 h-5" />
                  Terms of Service & Legal Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p className="text-muted-foreground">
                  <strong>Service Agreement:</strong> By using TruckNav Pro, you agree to our complete Terms of Service, 
                  including intellectual property protections and usage restrictions managed by Bespoke Marketing. Ai Ltd.
                </p>
                <p className="text-muted-foreground">
                  <strong>Legal Jurisdiction:</strong> These disclaimers are governed by applicable laws. 
                  Disputes will be resolved according to our Terms of Service.
                </p>
                <p className="text-muted-foreground">
                  <strong>Service Availability:</strong> TruckNav Pro may be unavailable due to maintenance, 
                  technical issues, or circumstances beyond our control.
                </p>
              </CardContent>
            </Card>

            {/* Professional Driver Responsibility */}
            <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <MapPin className="w-6 h-6 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-orange-800 dark:text-orange-200 text-lg mb-2">
                      Professional Driver Responsibility
                    </h3>
                    <p className="text-orange-700 dark:text-orange-300 text-sm leading-relaxed mb-2">
                      As a professional commercial vehicle operator, you acknowledge that:
                    </p>
                    <ul className="text-orange-700 dark:text-orange-300 text-sm space-y-1">
                      <li>• You are qualified and licensed to operate your commercial vehicle</li>
                      <li>• You will comply with all Hours of Service (HOS) regulations</li>
                      <li>• You will perform required vehicle inspections and maintenance</li>
                      <li>• You will verify load securement and weight distribution</li>
                      <li>• You will not operate the vehicle while impaired or distracted</li>
                      <li>• You accept full responsibility for safe vehicle operation</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
          </div>
          
          {/* Scroll to Bottom Button */}
          <div className="flex justify-center mt-2 mb-2">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={scrollToBottom}
              className="shadow-lg bg-primary/90 hover:bg-primary text-primary-foreground"
              data-testid="button-scroll-disclaimers"
            >
              <ChevronDown className="w-4 h-4 mr-1" />
              Scroll to Acknowledgments
            </Button>
          </div>
        </div>

        {/* Required Acknowledgments */}
        <div className="space-y-4 border-t pt-4 bg-card">
          <h3 className="font-semibold text-lg text-center">Required Legal Acknowledgments</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="acknowledge-navigation"
                checked={acknowledgeNavigation}
                onCheckedChange={(checked) => setAcknowledgeNavigation(checked === true)}
                data-testid="checkbox-acknowledge-navigation"
                className="mt-0.5"
              />
              <label htmlFor="acknowledge-navigation" className="font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I understand navigation is for guidance only and I am responsible for safe driving
                <span className="text-red-500 ml-1">*</span>
              </label>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox 
                id="acknowledge-liability"
                checked={acknowledgeLiability}
                onCheckedChange={(checked) => setAcknowledgeLiability(checked === true)}
                data-testid="checkbox-acknowledge-liability"
                className="mt-0.5"
              />
              <label htmlFor="acknowledge-liability" className="font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I accept the limitation of liability and service disclaimers
                <span className="text-red-500 ml-1">*</span>
              </label>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox 
                id="acknowledge-responsibility"
                checked={acknowledgeResponsibility}
                onCheckedChange={(checked) => setAcknowledgeResponsibility(checked === true)}
                data-testid="checkbox-acknowledge-responsibility"
                className="mt-0.5"
              />
              <label htmlFor="acknowledge-responsibility" className="font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I acknowledge my responsibility as a professional commercial driver
                <span className="text-red-500 ml-1">*</span>
              </label>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox 
                id="acknowledge-privacy"
                checked={acknowledgePrivacy}
                onCheckedChange={(checked) => setAcknowledgePrivacy(checked === true)}
                data-testid="checkbox-acknowledge-privacy"
                className="mt-0.5"
              />
              <label htmlFor="acknowledge-privacy" className="font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I consent to location data collection and privacy policy terms
                <span className="text-red-500 ml-1">*</span>
              </label>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox 
                id="acknowledge-terms"
                checked={acknowledgeTerms}
                onCheckedChange={(checked) => setAcknowledgeTerms(checked === true)}
                data-testid="checkbox-acknowledge-terms"
                className="mt-0.5"
              />
              <label htmlFor="acknowledge-terms" className="font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I agree to the complete Terms of Service and legal protections
                <span className="text-red-500 ml-1">*</span>
              </label>
            </div>

            <div className="flex items-start space-x-2 md:col-span-2">
              <Checkbox 
                id="accept-disclaimer"
                checked={acceptDisclaimer}
                onCheckedChange={(checked) => setAcceptDisclaimer(checked === true)}
                data-testid="checkbox-accept-disclaimer"
                className="mt-0.5"
              />
              <label htmlFor="accept-disclaimer" className="font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                <strong>I accept all legal disclaimers and understand the risks of truck navigation</strong>
                <span className="text-red-500 ml-1">*</span>
              </label>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              variant="outline" 
              onClick={handleDecline}
              className="min-w-[150px]"
              data-testid="button-decline-disclaimer"
            >
              Decline & Exit
            </Button>
            <Button 
              onClick={handleAccept}
              disabled={!canAccept}
              className="min-w-[200px] bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-accept-disclaimer"
            >
              {canAccept ? "Accept & Enter TruckNav Pro" : "Complete All Acknowledgments"}
            </Button>
          </div>
          
          <p className="text-xs text-center text-muted-foreground mt-2">
            By clicking "Accept & Enter TruckNav Pro", you acknowledge reading and understanding all disclaimers above.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}