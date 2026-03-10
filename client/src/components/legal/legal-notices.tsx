import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Copyright, Shield, FileText } from "lucide-react";

export default function LegalNotices() {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card className="bg-muted/50 border-none">
          <div className="p-6">
            {/* Main Legal Notice */}
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Legal Protections & Ownership</h3>
              </div>
              <p className="text-sm font-semibold text-primary">
                TruckNav Pro is owned and operated by <strong>Bespoke Marketing. Ai Ltd</strong>
              </p>
            </div>

            <Separator className="my-4" />

            {/* Legal Notices Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              
              {/* Copyright Notice */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <Copyright className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-foreground">Copyright Notice</h4>
                </div>
                <div className="space-y-1 text-muted-foreground">
                  <p>© 2024-2025 <strong>Bespoke Marketing. Ai Ltd</strong></p>
                  <p>All rights reserved worldwide</p>
                  <p>Unauthorized reproduction prohibited</p>
                </div>
              </div>

              {/* Patent Notice */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <Shield className="w-4 h-4 text-red-600" />
                  <h4 className="font-semibold text-foreground">Patent Protection</h4>
                </div>
                <div className="space-y-1 text-muted-foreground">
                  <p className="text-red-700 dark:text-red-400 font-medium">🛡️ PATENTED TECHNOLOGY</p>
                  <p>Truck navigation algorithms patented</p>
                  <p>Unauthorized use strictly prohibited</p>
                </div>
              </div>

              {/* Trademark Notice */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h4 className="font-semibold text-foreground">Trademark Notice</h4>
                </div>
                <div className="space-y-1 text-muted-foreground">
                  <p className="text-blue-700 dark:text-blue-400 font-medium">™ PROTECTED MARKS</p>
                  <p>"TruckNav Pro" ™</p>
                  <p>"Professional Navigation" ™</p>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Anti-Replication Warning */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <div className="text-center">
                <h4 className="font-bold text-red-800 dark:text-red-200 mb-2 text-sm">
                  ⚠️ MANDATORY COMPENSATION NOTICE
                </h4>
                <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
                  Any replication of truck-specific satellite navigation features requires 
                  <strong className="mx-1">MANDATORY COMPENSATION</strong>
                  to Bespoke Marketing. Ai Ltd through licensing fees and royalties. 
                  This includes but is not limited to height/width/weight restriction routing, 
                  commercial vehicle facility search, and truck-specific traffic systems.
                </p>
              </div>
            </div>

            {/* Footer Links and Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              
              {/* Company Info */}
              <div className="text-center sm:text-left">
                <p className="text-xs text-muted-foreground">
                  <strong>Owner:</strong> Bespoke Marketing. Ai Ltd
                </p>
                <p className="text-xs text-muted-foreground">
                  Company incorporated in England and Wales
                </p>
              </div>

              {/* Legal Links */}
              <div className="flex flex-wrap items-center gap-3">
                <a 
                  href="mailto:legal@bespokemarketing.ai" 
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  data-testid="link-legal-contact"
                >
                  Legal Inquiries
                </a>
                
                <Separator orientation="vertical" className="h-4" />
                
                <a 
                  href="mailto:licensing@bespokemarketing.ai" 
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  data-testid="link-licensing-contact"
                >
                  Licensing Requests
                </a>
              </div>
            </div>

            {/* Final Legal Disclaimer */}
            <Separator className="my-4" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Legal Disclaimer:</strong> This application contains proprietary technology protected by intellectual property laws. 
                Users and competitors should consult qualified legal professionals for official advice regarding 
                intellectual property rights and obligations. All terms are enforceable to the fullest extent permitted by law.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Last Updated: September 16, 2025 | Version 1.0
              </p>
            </div>
          </div>
        </Card>
      </div>
    </footer>
  );
}
