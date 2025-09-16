import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, AlertTriangle, FileText, Scale, ChevronDown } from "lucide-react";
import TermsOfService from "./terms-of-service";

interface UserAgreementProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function UserAgreement({ isOpen, onAccept, onDecline }: UserAgreementProps) {
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [acknowledgePatents, setAcknowledgePatents] = useState(false);
  const [acknowledgeTrademarks, setAcknowledgeTrademarks] = useState(false);
  const [acknowledgeLiability, setAcknowledgeLiability] = useState(false);
  const [acknowledgeReplication, setAcknowledgeReplication] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showFullTerms, setShowFullTerms] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const canAccept = hasReadTerms && acknowledgePatents && acknowledgeTrademarks && acknowledgeLiability && acknowledgeReplication && acceptTerms;

  const handleAccept = () => {
    if (canAccept) {
      localStorage.setItem('trucknav_terms_accepted', JSON.stringify({
        accepted: true,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }));
      onAccept();
    }
  };

  const handleDecline = () => {
    localStorage.removeItem('trucknav_terms_accepted');
    onDecline();
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTo({
          top: scrollElement.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  };

  if (showFullTerms) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col scroll-smooth">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Complete Terms of Service
            </DialogTitle>
            <DialogDescription>
              Full legal terms and conditions for TruckNav Pro usage, including patent protections and intellectual property rights owned by Bespoke Marketing.Ai Ltd.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[70vh] pr-4 scroll-smooth touch-scroll">
            <TermsOfService />
          </ScrollArea>
          <div className="flex justify-between mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowFullTerms(false)} data-testid="button-back-summary">
              Back to Summary
            </Button>
            <Button 
              onClick={() => {
                setHasReadTerms(true);
                setShowFullTerms(false);
              }}
              data-testid="button-mark-read"
            >
              Mark as Read & Return
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh] scroll-smooth" data-testid="dialog-user-agreement">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-6 h-6 text-primary" />
            Legal Agreement Required - TruckNav Pro
          </DialogTitle>
          <DialogDescription>
            You must accept these legal terms to use TruckNav Pro. This includes acknowledgment of patent protections, trademarks, and intellectual property rights owned by Bespoke Marketing.Ai Ltd.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <ScrollArea ref={scrollAreaRef} className="max-h-[60vh] pr-4 scroll-smooth touch-scroll">
            <div className="space-y-6">
            
            {/* Critical Notice */}
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-red-800 dark:text-red-200 text-lg mb-2">
                      MANDATORY LEGAL AGREEMENT
                    </h3>
                    <p className="text-red-700 dark:text-red-300 text-sm">
                      You must read and agree to these legally binding terms before using TruckNav Pro. 
                      This application contains patented technology owned by <strong>Bespoke Marketing.Ai Ltd</strong> 
                      and is protected by intellectual property laws.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Legal Protections Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Patent Protection */}
              <Card className="border-blue-200 dark:border-blue-800">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200">Patent Protection</h4>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    TruckNav Pro's truck navigation algorithms, vehicle restriction routing, and facility search 
                    features are protected by patents owned by Bespoke Marketing.Ai Ltd.
                  </p>
                </CardContent>
              </Card>

              {/* Trademark Protection */}
              <Card className="border-green-200 dark:border-green-800">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-green-800 dark:text-green-200">Trademark Protection</h4>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    "TruckNav Pro" and "Professional Navigation" are registered trademarks. 
                    All logos and branding are protected intellectual property.
                  </p>
                </CardContent>
              </Card>

              {/* Anti-Replication */}
              <Card className="border-purple-200 dark:border-purple-800">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-purple-800 dark:text-purple-200">Anti-Replication Clause</h4>
                  </div>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Any replication of truck-specific navigation features requires mandatory 
                    compensation to Bespoke Marketing.Ai Ltd through licensing fees and royalties.
                  </p>
                </CardContent>
              </Card>

              {/* Ownership */}
              <Card className="border-orange-200 dark:border-orange-800">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <h4 className="font-semibold text-orange-800 dark:text-orange-200">Exclusive Ownership</h4>
                  </div>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    All source code, algorithms, and designs are the exclusive property of 
                    Bespoke Marketing.Ai Ltd. Unauthorized use will result in legal action.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Full Terms Link */}
            <Card className="border-gray-200 dark:border-gray-700">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold mb-1">Complete Terms of Service</h4>
                    <p className="text-sm text-muted-foreground">
                      Read the full legal document with detailed protections and requirements.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowFullTerms(true)}
                    data-testid="button-view-full-terms"
                  >
                    View Full Terms
                  </Button>
                </div>
              </CardContent>
            </Card>
            </div>
          </ScrollArea>
          
          {/* Scroll to Bottom Button */}
          <div className="absolute bottom-2 right-4">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={scrollToBottom}
              className="shadow-lg bg-primary/90 hover:bg-primary text-primary-foreground"
              data-testid="button-scroll-bottom"
            >
              <ChevronDown className="w-4 h-4 mr-1" />
              Scroll to Accept
            </Button>
          </div>
        </div>

        {/* Agreement Checkboxes */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold text-lg">Required Acknowledgments</h3>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="read-terms"
                checked={hasReadTerms}
                onCheckedChange={(checked) => setHasReadTerms(checked === true)}
                data-testid="checkbox-read-terms"
              />
              <label htmlFor="read-terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I have read and understand the complete Terms of Service
                {!hasReadTerms && <span className="text-red-500 ml-1">*</span>}
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox 
                id="acknowledge-patents"
                checked={acknowledgePatents}
                onCheckedChange={(checked) => setAcknowledgePatents(checked === true)}
                data-testid="checkbox-acknowledge-patents"
              />
              <label htmlFor="acknowledge-patents" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I acknowledge that TruckNav Pro contains patented technology owned by Bespoke Marketing.Ai Ltd
                <span className="text-red-500 ml-1">*</span>
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox 
                id="acknowledge-trademarks"
                checked={acknowledgeTrademarks}
                onCheckedChange={(checked) => setAcknowledgeTrademarks(checked === true)}
                data-testid="checkbox-acknowledge-trademarks"
              />
              <label htmlFor="acknowledge-trademarks" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I acknowledge the trademark protection of "TruckNav Pro" and related branding
                <span className="text-red-500 ml-1">*</span>
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox 
                id="acknowledge-liability"
                checked={acknowledgeLiability}
                onCheckedChange={(checked) => setAcknowledgeLiability(checked === true)}
                data-testid="checkbox-acknowledge-liability"
              />
              <label htmlFor="acknowledge-liability" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                <span className="text-red-600 font-semibold">I understand and accept that Bespoke Marketing.Ai Ltd is not liable for any accidents, incidents, or damages resulting from using TruckNav Pro</span>
                <span className="text-red-500 ml-1">*</span>
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox 
                id="acknowledge-replication"
                checked={acknowledgeReplication}
                onCheckedChange={(checked) => setAcknowledgeReplication(checked === true)}
                data-testid="checkbox-acknowledge-replication"
              />
              <label htmlFor="acknowledge-replication" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I understand that replication of truck navigation features requires compensation to Bespoke Marketing.Ai Ltd
                <span className="text-red-500 ml-1">*</span>
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox 
                id="accept-terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                data-testid="checkbox-accept-terms"
              />
              <label htmlFor="accept-terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I agree to be legally bound by these Terms of Service and all intellectual property protections
                <span className="text-red-500 ml-1">*</span>
              </label>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              <strong>Legal Notice:</strong> This agreement is legally binding. For official legal advice regarding 
              these terms, please consult with qualified legal professionals. By accepting, you acknowledge that 
              you have had the opportunity to review these terms with legal counsel if desired.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleDecline}
            data-testid="button-decline-terms"
          >
            I Do Not Accept
          </Button>
          <Button 
            onClick={handleAccept}
            disabled={!canAccept}
            className={canAccept ? "bg-green-600 hover:bg-green-700" : ""}
            data-testid="button-accept-terms"
          >
            I Accept These Terms
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}