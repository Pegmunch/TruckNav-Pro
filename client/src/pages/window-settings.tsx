import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Settings, X, Shield, FileText } from 'lucide-react';
import CountryLanguageSelector from '@/components/country/country-language-selector';
import { MeasurementSelector } from '@/components/measurement/measurement-selector';
import LegalDisclaimerDialog from '@/components/legal/legal-disclaimer-dialog';
import LegalNotices from '@/components/legal/legal-notices';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLegalConsent } from '@/hooks/use-legal-consent';
import { cn } from '@/lib/utils';

export default function SettingsWindow() {
  const [isDisclaimerDialogOpen, setIsDisclaimerDialogOpen] = useState(false);
  const [isLegalNoticesOpen, setIsLegalNoticesOpen] = useState(false);
  const { hasAcceptedTerms } = useLegalConsent();

  useEffect(() => {
    document.title = 'TruckNav Pro - Settings';
  }, []);

  const handleCloseWindow = () => {
    window.close();
  };

  const handleViewLegalNotices = () => {
    setIsLegalNoticesOpen(true);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Window Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCloseWindow}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2 text-primary" />
              App Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Language & Region
              </label>
              <CountryLanguageSelector />
            </div>
            
            <Separator />
            
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Measurement System
              </label>
              <MeasurementSelector />
            </div>
            
            <Separator />
            
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Legal Information
              </label>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDisclaimerDialogOpen(true)}
                  className={cn(
                    "w-full justify-start h-auto p-3",
                    !hasAcceptedTerms && "ring-2 ring-red-400/50 bg-red-50/50 dark:bg-red-950/20"
                  )}
                >
                  <div className="relative">
                    <Shield className={cn(
                      "w-4 h-4 mr-3", 
                      hasAcceptedTerms ? "text-primary" : "text-red-600"
                    )} />
                    {!hasAcceptedTerms && (
                      <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-600 rounded-full border border-white animate-pulse"></div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className={cn(
                      "font-medium",
                      hasAcceptedTerms ? "text-foreground" : "text-red-800 dark:text-red-200"
                    )}>
                      Legal Disclaimer {!hasAcceptedTerms && "⚠️"}
                    </div>
                    <div className={cn(
                      "text-xs",
                      hasAcceptedTerms ? "text-muted-foreground" : "text-red-700 dark:text-red-300"
                    )}>
                      {hasAcceptedTerms ? "Terms of service and disclaimers" : "Required acknowledgements - click to review"}
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewLegalNotices}
                  className="w-full justify-start h-auto p-3"
                >
                  <FileText className="w-4 h-4 mr-3 text-blue-600" />
                  <div className="flex-1 text-left">
                    <div className="font-medium text-foreground">Legal Notices</div>
                    <div className="text-xs text-muted-foreground">Copyright and licensing information</div>
                  </div>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legal Disclaimer Dialog */}
      <LegalDisclaimerDialog
        open={isDisclaimerDialogOpen}
        onOpenChange={setIsDisclaimerDialogOpen}
      />

      {/* Legal Notices Dialog */}
      <Dialog open={isLegalNoticesOpen} onOpenChange={setIsLegalNoticesOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Legal Notices</DialogTitle>
          </DialogHeader>
          <LegalNotices />
        </DialogContent>
      </Dialog>
    </div>
  );
}