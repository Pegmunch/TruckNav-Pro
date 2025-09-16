import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Shield, Copyright, FileText, AlertTriangle } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Shield className="w-6 h-6 text-primary" />
            Terms of Service & Legal Protection
          </CardTitle>
          <p className="text-muted-foreground">
            TruckNav Pro - Professional Navigation System
          </p>
          <p className="text-sm font-semibold text-primary">
            Owned and Operated by Bespoke Marketing.Ai Ltd
          </p>
        </CardHeader>
        
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              
              {/* Important Notice */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-800 dark:text-amber-200">Important Legal Notice</h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      By using TruckNav Pro, you agree to these legally binding terms. This document contains important 
                      intellectual property protections and usage restrictions.
                    </p>
                  </div>
                </div>
              </div>

              {/* Acceptance Section */}
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Acceptance of Terms
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  By accessing or using TruckNav Pro ("the Application"), you agree to be bound by these Terms of Service 
                  and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited 
                  from using or accessing this application.
                </p>
              </section>

              <Separator />

              {/* Patent Protection */}
              <section>
                <h3 className="text-lg font-semibold mb-3 text-red-700 dark:text-red-400">
                  🛡️ PATENT PROTECTION NOTICE
                </h3>
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                    <strong>PATENTED TECHNOLOGY:</strong>
                  </p>
                  <ul className="text-sm text-red-700 dark:text-red-300 space-y-2">
                    <li>• TruckNav Pro and its truck navigation algorithms are protected by patents owned by <strong>Bespoke Marketing.Ai Ltd</strong></li>
                    <li>• Patent applications pending for specialized routing algorithms for commercial vehicles</li>
                    <li>• Proprietary height, width, and weight restriction detection technology</li>
                    <li>• Advanced truck-specific facility search and recommendation systems</li>
                    <li>• Real-time traffic incident reporting optimized for commercial vehicles</li>
                  </ul>
                  <p className="text-sm font-bold text-red-800 dark:text-red-200 mt-3">
                    Unauthorized use, reproduction, or creation of derivative works based on these patented features 
                    is strictly prohibited and may result in legal action.
                  </p>
                </div>
              </section>

              <Separator />

              {/* Trademark Protection */}
              <section>
                <h3 className="text-lg font-semibold mb-3 text-blue-700 dark:text-blue-400">
                  ™ TRADEMARK PROTECTION
                </h3>
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    <strong>PROTECTED TRADEMARKS:</strong>
                  </p>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• <strong>"TruckNav Pro"</strong> ™ - Registered trademark of Bespoke Marketing.Ai Ltd</li>
                    <li>• <strong>"Professional Navigation"</strong> ™ - In connection with truck navigation services</li>
                    <li>• All associated logos, graphics, and user interface designs</li>
                    <li>• Distinctive color schemes and branding elements</li>
                    <li>• Marketing slogans and promotional materials</li>
                  </ul>
                  <p className="text-sm font-bold text-blue-800 dark:text-blue-200 mt-3">
                    Use of these trademarks without written permission from Bespoke Marketing.Ai Ltd is strictly prohibited.
                  </p>
                </div>
              </section>

              <Separator />

              {/* Anti-Replication Clause */}
              <section>
                <h3 className="text-lg font-semibold mb-3 text-purple-700 dark:text-purple-400">
                  🚫 ANTI-REPLICATION & COMPENSATION CLAUSE
                </h3>
                <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <p className="text-sm font-bold text-purple-800 dark:text-purple-200 mb-3">
                    MANDATORY COMPENSATION FOR UNAUTHORIZED REPLICATION:
                  </p>
                  <div className="text-sm text-purple-700 dark:text-purple-300 space-y-2">
                    <p>
                      Any individual, company, or entity that creates, develops, or distributes software, applications, 
                      or systems that replicate, copy, or substantially similar to TruckNav Pro's truck-specific 
                      satellite navigation features shall be liable for compensation to Bespoke Marketing.Ai Ltd.
                    </p>
                    <p className="font-semibold">This includes but is not limited to:</p>
                    <ul className="ml-4 space-y-1">
                      <li>• Truck height, width, and weight restriction routing</li>
                      <li>• Commercial vehicle facility search and recommendations</li>
                      <li>• Truck-specific traffic incident reporting</li>
                      <li>• Professional vehicle profile management systems</li>
                      <li>• Route optimization for commercial vehicles</li>
                    </ul>
                    <p className="font-bold text-purple-900 dark:text-purple-100 mt-3 bg-purple-100 dark:bg-purple-900/30 p-2 rounded">
                      COMPENSATION REQUIREMENT: Any unauthorized replication requires payment of licensing fees 
                      and ongoing royalties to Bespoke Marketing.Ai Ltd, as determined by independent valuation.
                    </p>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Plagiarism Protection */}
              <section>
                <h3 className="text-lg font-semibold mb-3 text-orange-700 dark:text-orange-400">
                  📋 PLAGIARISM PROTECTION & INTELLECTUAL PROPERTY
                </h3>
                <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <p className="text-sm font-bold text-orange-800 dark:text-orange-200 mb-3">
                    PROTECTION AGAINST PLAGIARISM AND UNAUTHORIZED USE:
                  </p>
                  <div className="text-sm text-orange-700 dark:text-orange-300 space-y-2">
                    <p>
                      All source code, algorithms, user interface designs, database structures, and documentation 
                      related to TruckNav Pro are the exclusive intellectual property of <strong>Bespoke Marketing.Ai Ltd</strong>.
                    </p>
                    <p className="font-semibold">Prohibited Activities:</p>
                    <ul className="ml-4 space-y-1">
                      <li>• Reverse engineering or decompiling the application</li>
                      <li>• Copying or adapting user interface designs</li>
                      <li>• Replicating database structures or API endpoints</li>
                      <li>• Using similar naming conventions or branding</li>
                      <li>• Creating derivative works without explicit written permission</li>
                    </ul>
                    <p className="font-bold text-orange-900 dark:text-orange-100 mt-3 bg-orange-100 dark:bg-orange-900/30 p-2 rounded">
                      COMPENSATION FOR PLAGIARISM: Any detected plagiarism or unauthorized use will result in 
                      immediate legal action and claims for damages, including but not limited to lost profits, 
                      statutory damages, and attorney fees, all payable to Bespoke Marketing.Ai Ltd.
                    </p>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Ownership and Rights */}
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Copyright className="w-5 h-5" />
                  Ownership and Intellectual Property Rights
                </h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    <strong>Owner:</strong> Bespoke Marketing.Ai Ltd, a company incorporated under the laws of England and Wales.
                  </p>
                  <p>
                    <strong>Copyright:</strong> © 2024-2025 Bespoke Marketing.Ai Ltd. All rights reserved worldwide.
                  </p>
                  <p>
                    <strong>Exclusive Rights:</strong> Bespoke Marketing.Ai Ltd retains all rights, title, and interest 
                    in and to TruckNav Pro, including all intellectual property rights embodied therein.
                  </p>
                </div>
              </section>

              <Separator />

              {/* User Obligations */}
              <section>
                <h3 className="text-lg font-semibold mb-3">User Obligations and Restrictions</h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p><strong>You agree to:</strong></p>
                  <ul className="ml-4 space-y-1">
                    <li>• Use TruckNav Pro only for lawful purposes</li>
                    <li>• Respect all intellectual property rights</li>
                    <li>• Not attempt to circumvent security measures</li>
                    <li>• Report any suspected intellectual property violations</li>
                    <li>• Comply with all applicable laws and regulations</li>
                  </ul>
                </div>
              </section>

              <Separator />

              {/* Liability Disclaimer */}
              <section>
                <h3 className="text-lg font-semibold mb-3 text-red-700 dark:text-red-400">
                  ⚠️ CRITICAL LIABILITY DISCLAIMER & NON-LIABILITY CLAUSE
                </h3>
                <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-6">
                  <div className="space-y-4">
                    <div className="bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-600 rounded-lg p-4">
                      <p className="text-sm font-bold text-red-900 dark:text-red-100 text-center">
                        🚨 CRITICAL SAFETY NOTICE - READ CAREFULLY 🚨
                      </p>
                      <p className="text-xs text-red-800 dark:text-red-200 text-center mt-2">
                        By using TruckNav Pro, you acknowledge and accept full responsibility for all driving decisions
                      </p>
                    </div>

                    <div className="text-sm text-red-800 dark:text-red-200 space-y-3">
                      <p className="font-bold text-base mb-3">
                        COMPLETE NON-LIABILITY FOR ACCIDENTS AND INCIDENTS:
                      </p>
                      
                      <p>
                        <strong>Bespoke Marketing.Ai Ltd</strong> and <strong>TruckNav Pro</strong> expressly disclaim all liability 
                        and responsibility for any and all accidents, incidents, damages, injuries, losses, or claims arising 
                        from or related to the use of this navigation application.
                      </p>

                      <div className="bg-red-200 dark:bg-red-800/30 p-3 rounded">
                        <p className="font-semibold mb-2">YOU ACKNOWLEDGE AND AGREE THAT:</p>
                        <ul className="space-y-1 text-xs">
                          <li>• <strong>Navigation Guidance Only:</strong> TruckNav Pro provides navigational suggestions only and does not replace professional driving judgment</li>
                          <li>• <strong>Driver Responsibility:</strong> You are solely responsible for safe operation of your vehicle at all times</li>
                          <li>• <strong>Real-Time Conditions:</strong> Road conditions, restrictions, and traffic patterns change constantly and may not be reflected in real-time</li>
                          <li>• <strong>Vehicle Compliance:</strong> You must verify that your vehicle complies with all local regulations and restrictions</li>
                          <li>• <strong>Professional Verification:</strong> Always verify route suitability through official sources and local authorities</li>
                        </ul>
                      </div>

                      <p className="font-bold">
                        SPECIFICALLY, WE ARE NOT LIABLE FOR:
                      </p>
                      <ul className="ml-4 space-y-1 text-xs">
                        <li>• Vehicle accidents, collisions, or traffic incidents of any nature</li>
                        <li>• Damage to vehicles, cargo, or property</li>
                        <li>• Personal injury, death, or bodily harm to drivers, passengers, or third parties</li>
                        <li>• Violations of traffic laws, weight restrictions, or vehicle regulations</li>
                        <li>• Bridge strikes, clearance violations, or infrastructure damage</li>
                        <li>• Route delays, fuel costs, or operational expenses</li>
                        <li>• Lost business, missed deliveries, or contractual penalties</li>
                        <li>• Environmental damage or hazardous material incidents</li>
                        <li>• Legal fines, penalties, or enforcement actions</li>
                        <li>• Any consequential, indirect, or punitive damages whatsoever</li>
                      </ul>

                      <div className="bg-red-300 dark:bg-red-700/40 p-3 rounded border border-red-500">
                        <p className="font-bold text-center text-red-900 dark:text-red-100">
                          MAXIMUM LIABILITY LIMITATION
                        </p>
                        <p className="text-xs text-center mt-1">
                          In no event shall Bespoke Marketing.Ai Ltd's total liability exceed the amount paid by you for 
                          TruckNav Pro services in the 12 months preceding any claim. This limitation applies regardless 
                          of the legal theory of liability.
                        </p>
                      </div>

                      <p className="font-bold text-center">
                        USE AT YOUR OWN RISK - NO WARRANTIES PROVIDED
                      </p>
                      <p className="text-xs text-center">
                        TruckNav Pro is provided "AS IS" without warranties of any kind. We disclaim all warranties, 
                        express or implied, including merchantability, fitness for a particular purpose, and accuracy.
                      </p>

                      <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-600 p-3 rounded">
                        <p className="font-bold text-yellow-800 dark:text-yellow-200 text-center mb-2">
                          ⚠️ PROFESSIONAL DRIVER RESPONSIBILITY ⚠️
                        </p>
                        <p className="text-xs text-yellow-800 dark:text-yellow-200 text-center">
                          As a professional driver, you maintain ultimate responsibility for route planning, vehicle safety, 
                          legal compliance, and safe operation. TruckNav Pro is a supplementary tool only.
                        </p>
                      </div>

                      <p className="font-bold text-center mt-4">
                        BY USING TRUCKNAV PRO, YOU VOLUNTARILY ASSUME ALL RISKS AND WAIVE ALL CLAIMS 
                        AGAINST BESPOKE MARKETING.AI LTD FOR ANY DAMAGES OR LOSSES
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Legal Disclaimer */}
              <section>
                <h3 className="text-lg font-semibold mb-3">Legal Disclaimer</h3>
                <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">
                    <strong>IMPORTANT:</strong> This document represents standard legal protections for intellectual property. 
                    Users and competitors should consult with qualified legal professionals for official legal advice regarding 
                    intellectual property rights and obligations. The terms contained herein are enforceable to the fullest 
                    extent permitted by law.
                  </p>
                </div>
              </section>

              <Separator />

              {/* Contact Information */}
              <section>
                <h3 className="text-lg font-semibold mb-3">Contact Information</h3>
                <div className="text-sm text-muted-foreground">
                  <p><strong>Legal Inquiries:</strong> legal@bespokemarketing.ai</p>
                  <p><strong>Licensing Requests:</strong> licensing@bespokemarketing.ai</p>
                  <p><strong>Company:</strong> Bespoke Marketing.Ai Ltd</p>
                  <p><strong>Last Updated:</strong> September 16, 2025</p>
                </div>
              </section>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}