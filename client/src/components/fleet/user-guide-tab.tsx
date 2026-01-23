import { useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, Navigation, Truck, Users, Wrench, Fuel, FileText, 
  BarChart3, AlertTriangle, MapPin, Shield, Radio, Activity, 
  Clock, CreditCard, MapPinned, Menu, Mic, X, AlertCircle,
  Compass, Layers, Mountain, Car, ChevronRight, CheckCircle2,
  Smartphone, Monitor, Globe, Zap, Lock, Bell, Route, Search
} from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  icon: ReactNode;
  content: ReactNode;
}

export function UserGuideTab() {
  const [activeSection, setActiveSection] = useState<string>('overview');

  const sections: GuideSection[] = [
    {
      id: 'overview',
      title: 'Product Overview',
      icon: <BookOpen className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-2">Welcome to TruckNav Pro</h2>
            <p className="text-blue-100">The Complete Heavy Goods Vehicle Navigation & Fleet Management Solution</p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Key Benefits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Truck-Specific Routing:</strong> Avoid low bridges, weight restrictions, and narrow roads unsuitable for HGVs</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Real-Time Traffic:</strong> Live traffic data with automatic rerouting to save time and fuel</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Fleet Visibility:</strong> Track all vehicles in real-time with GPS positioning</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Compliance Management:</strong> Stay ahead of regulatory requirements and inspections</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Cost Reduction:</strong> Optimize routes, reduce fuel consumption, and minimize vehicle wear</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  Platform Availability
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <Smartphone className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-medium">Mobile (iOS & Android)</p>
                    <p className="text-xs text-muted-foreground">Full navigation with voice commands, offline maps, and hands-free operation</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <Monitor className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="font-medium">Desktop (Fleet Management)</p>
                    <p className="text-xs text-muted-foreground">Complete fleet oversight, analytics, billing, and administrative controls</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">System Architecture</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>TruckNav Pro is built on enterprise-grade technology:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>TomTom Truck Routing API:</strong> Industry-leading routing engine optimized for commercial vehicles</li>
                <li><strong>MapLibre GL:</strong> GPU-accelerated 3D maps with smooth performance</li>
                <li><strong>Real-Time Sync:</strong> Instant updates across all connected devices</li>
                <li><strong>Secure Cloud Storage:</strong> All data encrypted and backed up automatically</li>
                <li><strong>Progressive Web App:</strong> Works offline with cached routes and maps</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'data-sync',
      title: 'Data Sync & Calculations',
      icon: <Zap className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-600" />
            Data Sync & Automatic Calculations
          </h2>
          
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                How Your Data Connects
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>When you add a vehicle in the <strong>Vehicles</strong> tab, it automatically becomes available across all connected tabs:</p>
              <div className="grid gap-2">
                <div className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span><strong>Service Records:</strong> Select your vehicle when logging maintenance</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span><strong>Fuel Logs:</strong> Track fuel consumption per vehicle</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span><strong>Documents:</strong> Upload MOT, insurance, and registration documents</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span><strong>Cost Analytics:</strong> See costs broken down by vehicle</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span><strong>Trip Tracking:</strong> Link trips to specific vehicles for profitability analysis</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Automatic Calculations
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <p>The system automatically calculates key metrics as you enter data:</p>
              
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="font-medium text-blue-700 dark:text-blue-300">Cost Analytics Dashboard</p>
                  <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                    <li><strong>Total Costs:</strong> Sum of all service, fuel, and maintenance costs</li>
                    <li><strong>Average Cost Per Vehicle:</strong> Total costs ÷ number of vehicles</li>
                    <li><strong>Cost Breakdown by Type:</strong> Pie chart showing fuel vs maintenance vs repairs</li>
                    <li><strong>Monthly Trends:</strong> Line chart showing spending over time</li>
                  </ul>
                </div>
                
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="font-medium text-green-700 dark:text-green-300">Fuel Efficiency</p>
                  <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                    <li><strong>MPG Calculation:</strong> (Current Odometer - Previous Odometer) ÷ Litres × 4.546</li>
                    <li><strong>Cost Per Mile:</strong> Total fuel cost ÷ miles travelled</li>
                    <li>Requires 2+ fuel entries with odometer readings for accurate calculation</li>
                  </ul>
                </div>
                
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="font-medium text-yellow-700 dark:text-yellow-300">Trip Profitability</p>
                  <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                    <li><strong>Profit:</strong> Revenue - (Fuel + Driver + Vehicle Costs + Tolls)</li>
                    <li><strong>Profit Margin:</strong> (Profit ÷ Revenue) × 100%</li>
                    <li><strong>Efficiency:</strong> Actual Distance ÷ Planned Distance</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Operator Data Sync
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>When you add operators in the <strong>Operators</strong> tab, they become available for assignment:</p>
              <div className="grid gap-2">
                <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5" />
                  <span><strong>Vehicle Assignments:</strong> Assign drivers to specific vehicles</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5" />
                  <span><strong>Trip Records:</strong> Link operators to completed trips</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5" />
                  <span><strong>Incident Logging:</strong> Record which operator was involved in incidents</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                Form Validation & Error Handling
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>All forms in Fleet Management include built-in validation:</p>
              <div className="grid gap-2">
                <div className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                  <CheckCircle2 className="w-4 h-4 text-orange-500 mt-0.5" />
                  <span><strong>Required Fields:</strong> Forms check all required fields before submission</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                  <CheckCircle2 className="w-4 h-4 text-orange-500 mt-0.5" />
                  <span><strong>Error Messages:</strong> Clear notifications explain what went wrong</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                  <CheckCircle2 className="w-4 h-4 text-orange-500 mt-0.5" />
                  <span><strong>Automatic Refresh:</strong> Data updates instantly after successful save</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                  <CheckCircle2 className="w-4 h-4 text-orange-500 mt-0.5" />
                  <span><strong>Chart Tooltips:</strong> Hover over charts to see exact values (£XX.XX format)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-500" />
                Enterprise Features (Fleet Subscription)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>The following features require an active Fleet subscription and GPS hardware integration:</p>
              <div className="grid gap-2">
                <div className="flex items-start gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                  <Radio className="w-4 h-4 text-purple-500 mt-0.5" />
                  <div>
                    <span className="font-medium">Real-Time Tracking:</span>
                    <span className="text-muted-foreground"> Live GPS positions of all vehicles on the map</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                  <MapPinned className="w-4 h-4 text-purple-500 mt-0.5" />
                  <div>
                    <span className="font-medium">Geofencing:</span>
                    <span className="text-muted-foreground"> Automatic alerts when vehicles enter/exit defined zones</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                  <Activity className="w-4 h-4 text-purple-500 mt-0.5" />
                  <div>
                    <span className="font-medium">Driver Behavior:</span>
                    <span className="text-muted-foreground"> Safety scores based on speeding, harsh braking, and cornering</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Note: Without GPS integration, these tabs display demonstration data to preview functionality.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick Reference: Which Tabs Share Data</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Tab</th>
                      <th className="text-center py-2 px-2">Uses Vehicles</th>
                      <th className="text-center py-2 px-2">Uses Operators</th>
                      <th className="text-center py-2 px-2">Auto Calculations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr><td className="py-2 px-2">Vehicles</td><td className="text-center">-</td><td className="text-center">-</td><td className="text-center">-</td></tr>
                    <tr><td className="py-2 px-2">Operators</td><td className="text-center">-</td><td className="text-center">-</td><td className="text-center">Expiry Alerts</td></tr>
                    <tr><td className="py-2 px-2">Service</td><td className="text-center">✓</td><td className="text-center">-</td><td className="text-center">Next Service Due</td></tr>
                    <tr><td className="py-2 px-2">Fuel</td><td className="text-center">✓</td><td className="text-center">-</td><td className="text-center">MPG, Cost/Mile</td></tr>
                    <tr><td className="py-2 px-2">Documents</td><td className="text-center">✓</td><td className="text-center">-</td><td className="text-center">Expiry Alerts</td></tr>
                    <tr><td className="py-2 px-2">Analytics</td><td className="text-center">✓</td><td className="text-center">-</td><td className="text-center">All Costs & Trends</td></tr>
                    <tr><td className="py-2 px-2">Trips</td><td className="text-center">✓</td><td className="text-center">✓</td><td className="text-center">Profit & Margins</td></tr>
                    <tr><td className="py-2 px-2">Incidents</td><td className="text-center">✓</td><td className="text-center">✓</td><td className="text-center">-</td></tr>
                    <tr><td className="py-2 px-2">Compliance</td><td className="text-center">✓</td><td className="text-center">-</td><td className="text-center">Status Alerts</td></tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'navigation',
      title: 'Navigation System',
      icon: <Navigation className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Navigation className="w-6 h-6 text-blue-600" />
            Navigation System Guide
          </h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3-Mode Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Badge className="bg-blue-600">1</Badge>
                <div>
                  <p className="font-medium">PLAN Mode</p>
                  <p className="text-sm text-muted-foreground">Enter your destination, select vehicle profile, and review route options. The system calculates truck-safe routes avoiding height, weight, and width restrictions.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <Badge className="bg-yellow-600">2</Badge>
                <div>
                  <p className="font-medium">PREVIEW Mode</p>
                  <p className="text-sm text-muted-foreground">Review the calculated route on the map. See restriction warnings, estimated time, and distance. Use the fly-by animation to preview your journey before starting.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Badge className="bg-green-600">3</Badge>
                <div>
                  <p className="font-medium">NAVIGATE Mode</p>
                  <p className="text-sm text-muted-foreground">Real-time turn-by-turn guidance with voice instructions, speed limit display, and automatic rerouting. The map follows your position with 3D perspective view.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Route className="w-5 h-5 text-blue-500" />
                  Route Planning Features
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p><strong>Address Autocomplete:</strong> Start typing any address and get intelligent suggestions powered by TomTom Search API</p>
                <p><strong>POI Search:</strong> Find truck stops, rest areas, fuel stations, and parking directly from the search</p>
                <p><strong>Vehicle Profiles:</strong> Save multiple vehicle configurations with exact dimensions and weight</p>
                <p><strong>Restriction Warnings:</strong> Color-coded alerts for bridges, tunnels, and roads with restrictions</p>
                <p><strong>Route Alternatives:</strong> Compare different route options based on time, distance, or toll costs</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Compass className="w-5 h-5 text-green-500" />
                  Navigation Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p><strong>Compass Button:</strong> Reset map bearing to north</p>
                <p><strong>Recenter:</strong> Lock camera to your current GPS position</p>
                <p><strong>Zoom Controls:</strong> Adjust map zoom level</p>
                <p><strong>3D Mode:</strong> Toggle between 2D and 3D perspective view</p>
                <p><strong>Traffic Layer:</strong> Show/hide real-time traffic flow</p>
                <p><strong>Satellite View:</strong> Switch between road map and satellite imagery</p>
                <p><strong>Incidents:</strong> View reported road incidents nearby</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Mic className="w-5 h-5 text-purple-500" />
                Voice Commands
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="mb-3">During navigation, tap the microphone button to enable hands-free incident reporting:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['Report Traffic', 'Report Accident', 'Road Hazard', 'Road Closed', 'Police Ahead', 'Speed Camera', 'Construction', 'Bad Weather'].map(cmd => (
                  <Badge key={cmd} variant="outline" className="justify-center py-1">{cmd}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Menu className="w-5 h-5 text-blue-500" />
                Mobile Menu
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Access the full-screen menu by tapping the blue hamburger button:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Route Tab:</strong> Enter origin and destination, plan new routes</li>
                <li><strong>Recent Tab:</strong> Quick access to your last 10 destinations</li>
                <li><strong>Vehicle Tab:</strong> Select or edit your vehicle profile</li>
                <li><strong>Settings Tab:</strong> Theme, units, and app preferences</li>
                <li><strong>Tools Tab:</strong> Additional utilities and features</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'vehicles',
      title: 'Vehicle Registry',
      icon: <Truck className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            Vehicle Registry Guide
          </h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purpose & Benefits</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>The Vehicle Registry is your central database for all fleet vehicles. Maintaining accurate records here ensures:</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Accurate routing based on actual vehicle dimensions</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Proper service scheduling and maintenance tracking</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Fuel consumption analysis per vehicle</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Compliance documentation management</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Vehicle Information Fields</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="font-medium mb-2">Identification</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Registration Number (license plate)</li>
                    <li>Trailer Number (if applicable)</li>
                    <li>VIN (Vehicle Identification Number)</li>
                    <li>Make and Model</li>
                    <li>Year of Manufacture</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-2">Specifications</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Vehicle Type (Rigid, Articulated, etc.)</li>
                    <li>Fuel Type (Diesel, Electric, Hybrid)</li>
                    <li>Tank Capacity (litres)</li>
                    <li>Current Mileage</li>
                    <li>Status (Active, Maintenance, Decommissioned)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">How to Use</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><strong>Adding a Vehicle:</strong> Click the "Add Vehicle" button, fill in all required fields, and save. The vehicle will immediately appear in your fleet list.</p>
              <p><strong>Editing:</strong> Click the edit icon next to any vehicle to update its information. Changes are saved automatically.</p>
              <p><strong>Status Management:</strong> Set vehicles to "Maintenance" when they're in the shop, or "Decommissioned" for retired vehicles. This affects scheduling and tracking.</p>
              <p><strong>Linking:</strong> Vehicles can be linked to operators, service records, and fuel logs for comprehensive tracking.</p>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'operators',
      title: 'Operator Management',
      icon: <Users className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Operator Management Guide
          </h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purpose & Benefits</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>Manage all drivers and operators in your fleet with comprehensive profile tracking:</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>License expiry tracking and renewal alerts</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Driver CPC (Certificate of Professional Competence) monitoring</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Tachograph card management</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Assignment tracking for vehicle-operator relationships</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Operator Information Fields</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="font-medium mb-2">Personal Details</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Full Name</li>
                    <li>Employee ID</li>
                    <li>Contact Information</li>
                    <li>Emergency Contact</li>
                    <li>Status (Active, On Leave, Terminated)</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-2">Licensing & Compliance</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Driving License Number</li>
                    <li>License Type (Category C, C+E, etc.)</li>
                    <li>License Expiry Date</li>
                    <li>Driver CPC Expiry Date</li>
                    <li>Tachograph Card Number & Expiry</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-yellow-500" />
                Expiry Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>The system automatically monitors expiry dates and displays alerts in the Notifications Banner when:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
                <li>Driving license expires within 30 days</li>
                <li>Driver CPC expires within 60 days</li>
                <li>Tachograph card expires within 30 days</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'service',
      title: 'Service Records',
      icon: <Wrench className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wrench className="w-6 h-6 text-blue-600" />
            Service Records Guide
          </h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purpose & Benefits</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>Comprehensive maintenance tracking ensures your fleet remains roadworthy and compliant:</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Never miss an MOT or safety inspection</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Track maintenance costs per vehicle</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Maintain complete service history for resale value</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Identify vehicles with recurring issues</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Service Types</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid gap-2 md:grid-cols-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <p className="font-medium">Routine Service</p>
                  <p className="text-xs text-muted-foreground">Oil changes, filter replacements, scheduled maintenance</p>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <p className="font-medium">MOT</p>
                  <p className="text-xs text-muted-foreground">Annual Ministry of Transport test</p>
                </div>
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                  <p className="font-medium">Repair</p>
                  <p className="text-xs text-muted-foreground">Unscheduled repairs and fixes</p>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                  <p className="font-medium">Inspection</p>
                  <p className="text-xs text-muted-foreground">Safety inspections and checks</p>
                </div>
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                  <p className="font-medium">Tachograph Calibration</p>
                  <p className="text-xs text-muted-foreground">Required every 2 years</p>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <p className="font-medium">Other</p>
                  <p className="text-xs text-muted-foreground">Tyres, bodywork, accessories</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recording Service Information</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>For each service record, capture:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Vehicle:</strong> Select from your registered fleet</li>
                <li><strong>Service Type:</strong> Categorize the work performed</li>
                <li><strong>Service Date:</strong> When the work was completed</li>
                <li><strong>Next Due Date:</strong> When the next service is required</li>
                <li><strong>Mileage at Service:</strong> Odometer reading at time of service</li>
                <li><strong>Cost:</strong> Total cost including parts and labour</li>
                <li><strong>Service Provider:</strong> Garage or workshop name</li>
                <li><strong>Parts Replaced:</strong> List of components changed</li>
                <li><strong>Notes:</strong> Additional observations or recommendations</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'fuel',
      title: 'Fuel Logs',
      icon: <Fuel className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Fuel className="w-6 h-6 text-blue-600" />
            Fuel Consumption Guide
          </h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purpose & Benefits</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>Track every fuel purchase to optimize consumption and reduce costs:</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Calculate MPG for each vehicle</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Identify fuel-inefficient vehicles</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Track fuel costs across the fleet</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Monitor for fuel theft or misuse</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Fuel Log Fields</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="font-medium mb-2">Required Information</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Vehicle (select from fleet)</li>
                    <li>Date of fill-up</li>
                    <li>Odometer reading</li>
                    <li>Litres added</li>
                    <li>Total cost</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-2">Optional Details</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Fuel station location</li>
                    <li>Fuel type (if multi-fuel)</li>
                    <li>Full tank indicator</li>
                    <li>Receipt reference</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-500" />
                Automatic MPG Calculation
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>The system automatically calculates fuel efficiency when you have two or more fill-up records with odometer readings. The calculation uses:</p>
              <p className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded font-mono text-xs">
                MPG = (Current Odometer - Previous Odometer) / Litres × 4.54609
              </p>
              <p className="mt-2 text-muted-foreground">Tip: Always fill to full tank for the most accurate MPG calculations.</p>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'documents',
      title: 'Documents',
      icon: <FileText className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Document Management Guide
          </h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purpose & Benefits</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>Store and manage all vehicle-related documentation in one secure location:</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Instant access to any document from anywhere</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Never lose important paperwork</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Share documents with DVSA inspectors</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Expiry date tracking and alerts</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Document Types</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <p className="font-medium">V5C Registration</p>
                  <p className="text-xs text-muted-foreground">Vehicle registration certificate</p>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <p className="font-medium">MOT Certificate</p>
                  <p className="text-xs text-muted-foreground">Annual roadworthiness test</p>
                </div>
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                  <p className="font-medium">Insurance Certificate</p>
                  <p className="text-xs text-muted-foreground">Goods in transit and vehicle cover</p>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                  <p className="font-medium">Operator Licence</p>
                  <p className="text-xs text-muted-foreground">O-Licence documentation</p>
                </div>
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                  <p className="font-medium">Tachograph Calibration</p>
                  <p className="text-xs text-muted-foreground">Calibration certificates</p>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <p className="font-medium">Other Documents</p>
                  <p className="text-xs text-muted-foreground">Any additional paperwork</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'analytics',
      title: 'Cost Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Cost Analytics Dashboard Guide
          </h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purpose & Benefits</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>Gain financial visibility across your entire fleet operation:</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Understand where money is being spent</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Identify high-cost vehicles</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Track cost trends over time</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Make data-driven decisions</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Dashboard Components</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                <p className="font-medium">Cost Breakdown Pie Chart</p>
                <p className="text-muted-foreground">Visual breakdown showing the proportion of costs by category: fuel, maintenance, repairs, insurance, etc.</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                <p className="font-medium">Costs Per Vehicle Bar Chart</p>
                <p className="text-muted-foreground">Compare total costs across all vehicles to identify outliers requiring attention.</p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <p className="font-medium">Monthly Trend Line</p>
                <p className="text-muted-foreground">Track how costs change over time to spot seasonal patterns or concerning increases.</p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                <p className="font-medium">Summary Cards</p>
                <p className="text-muted-foreground">Key metrics at a glance: total costs, average per vehicle, highest cost category.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'incidents',
      title: 'Incidents',
      icon: <AlertTriangle className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            Incident Logging Guide
          </h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purpose & Benefits</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>Record and analyze all fleet incidents for safety improvement:</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Document accidents for insurance claims</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Track patterns to prevent future incidents</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Maintain compliance with reporting requirements</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Implement preventative measures</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Incident Types & Severity</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid gap-2 md:grid-cols-2 mb-4">
                <div className="space-y-1">
                  <p className="font-medium">Types</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">Accident</Badge>
                    <Badge variant="outline">Damage</Badge>
                    <Badge variant="outline">Violation</Badge>
                    <Badge variant="outline">Breakdown</Badge>
                    <Badge variant="outline">Near Miss</Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Severity Levels</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge className="bg-red-500">Critical</Badge>
                    <Badge className="bg-orange-500">High</Badge>
                    <Badge className="bg-yellow-500">Medium</Badge>
                    <Badge className="bg-blue-500">Low</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Incident Recording</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>For each incident, capture:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Date, time, and location</li>
                <li>Vehicle and operator involved</li>
                <li>Incident type and severity</li>
                <li>Detailed description</li>
                <li>Root cause analysis</li>
                <li>Preventative measures taken</li>
                <li>Insurance claim reference (if applicable)</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'trips',
      title: 'Trip Tracking',
      icon: <MapPin className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-600" />
            Trip Tracking & Profitability Guide
          </h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purpose & Benefits</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>Monitor all trips and analyze profitability:</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Track planned vs actual metrics</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Calculate profit margins per trip</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Identify profitable routes and customers</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Optimize pricing strategies</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Trip Metrics</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="font-medium mb-2">Planned Metrics</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Estimated distance</li>
                    <li>Estimated duration</li>
                    <li>Quoted cost to customer</li>
                    <li>Expected revenue</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-2">Actual Metrics</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Actual distance travelled</li>
                    <li>Actual duration</li>
                    <li>Real costs incurred</li>
                    <li>Final revenue received</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Profitability Calculation
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>The system automatically calculates:</p>
              <p className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded font-mono text-xs">
                Profit = Revenue - (Fuel Cost + Driver Cost + Vehicle Costs + Tolls)
              </p>
              <p className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded font-mono text-xs">
                Margin % = (Profit / Revenue) × 100
              </p>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'compliance',
      title: 'Compliance',
      icon: <Shield className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Compliance & Regulatory Guide
          </h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purpose & Benefits</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>Stay compliant with all regulatory requirements:</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Track all mandatory inspections</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Receive alerts before deadlines</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Avoid fines and penalties</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Maintain operator licence standing</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Compliance Areas</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <p className="font-medium">DVLA Checks</p>
                  <p className="text-xs text-muted-foreground">Driver licence validation</p>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <p className="font-medium">Emission Standards</p>
                  <p className="text-xs text-muted-foreground">ULEZ, CAZ compliance</p>
                </div>
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                  <p className="font-medium">Hazmat Certifications</p>
                  <p className="text-xs text-muted-foreground">ADR certificates for dangerous goods</p>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                  <p className="font-medium">Tachograph Inspections</p>
                  <p className="text-xs text-muted-foreground">2-yearly calibration requirement</p>
                </div>
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                  <p className="font-medium">Working Hours</p>
                  <p className="text-xs text-muted-foreground">EU/UK driving regulations</p>
                </div>
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
                  <p className="font-medium">Vehicle Safety</p>
                  <p className="text-xs text-muted-foreground">MOT, safety inspections</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'tracking',
      title: 'Real-Time Tracking',
      icon: <Radio className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Radio className="w-6 h-6 text-blue-600" />
            Real-Time Fleet Tracking Guide
          </h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purpose & Benefits</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>See where every vehicle is, right now:</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Live GPS positions on interactive map</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Vehicle status indicators (Moving/Stopped/Offline)</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Respond quickly to customer enquiries</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Automatic 30-second position refresh</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Map Features</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><strong>Vehicle Markers:</strong> Each vehicle appears as a truck icon on the map with colour indicating status</p>
              <p><strong>Click to Centre:</strong> Click any vehicle in the list to centre the map on its location</p>
              <p><strong>Vehicle List Panel:</strong> Shows all vehicles with registration, status, and last update time</p>
              <p><strong>Status Colours:</strong></p>
              <div className="flex gap-2 mt-2">
                <Badge className="bg-green-500">Moving</Badge>
                <Badge className="bg-yellow-500">Stopped</Badge>
                <Badge className="bg-gray-500">Offline</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'geofencing',
      title: 'Geofencing',
      icon: <MapPinned className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MapPinned className="w-6 h-6 text-blue-600" />
            Geofencing System Guide
          </h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purpose & Benefits</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>Create virtual boundaries and receive alerts when vehicles enter or exit:</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Automatic arrival/departure notifications</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Define restricted areas</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Track time at customer sites</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Create checkpoint monitoring</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Zone Types</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="font-medium">Warehouse</p>
                    <p className="text-xs text-muted-foreground">Your depot or distribution centre</p>
                  </div>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <div>
                    <p className="font-medium">Customer</p>
                    <p className="text-xs text-muted-foreground">Delivery locations</p>
                  </div>
                </div>
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <div>
                    <p className="font-medium">Restricted</p>
                    <p className="text-xs text-muted-foreground">Areas to avoid</p>
                  </div>
                </div>
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                  <div>
                    <p className="font-medium">Checkpoint</p>
                    <p className="text-xs text-muted-foreground">Waypoints to monitor</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Creating a Geofence</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Click "Add Zone" button</li>
                <li>Enter a name for the zone</li>
                <li>Select the zone type</li>
                <li>Set the radius in metres</li>
                <li>Click on the map to place the zone centre</li>
                <li>The zone appears as a coloured circle</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'behavior',
      title: 'Driver Behavior',
      icon: <Activity className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            Driver Behavior Analytics Guide
          </h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purpose & Benefits</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>Monitor and improve driver safety across your fleet:</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Safety scoring system</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Identify high-risk drivers for coaching</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Reduce accident rates</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Lower insurance premiums</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Monitored Behaviors</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
                  <p className="font-medium">Speeding</p>
                  <p className="text-xs text-muted-foreground">Exceeding posted speed limits</p>
                </div>
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                  <p className="font-medium">Harsh Braking</p>
                  <p className="text-xs text-muted-foreground">Sudden deceleration events</p>
                </div>
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                  <p className="font-medium">Harsh Acceleration</p>
                  <p className="text-xs text-muted-foreground">Aggressive take-offs</p>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                  <p className="font-medium">Harsh Cornering</p>
                  <p className="text-xs text-muted-foreground">Taking corners too fast</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Driver Leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>The leaderboard ranks all drivers by their safety score (0-100):</p>
              <div className="flex gap-2">
                <Badge className="bg-green-500">90-100: Excellent</Badge>
                <Badge className="bg-yellow-500">70-89: Good</Badge>
                <Badge className="bg-orange-500">50-69: Needs Improvement</Badge>
                <Badge className="bg-red-500">0-49: High Risk</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'hos',
      title: 'Hours of Service',
      icon: <Clock className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" />
            Hours of Service (HoS) Compliance Guide
          </h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purpose & Benefits</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>Ensure compliance with EU/UK driving time regulations:</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Track daily/weekly driving hours</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Automatic violation detection</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Remaining time calculations</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Prevent costly fines</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">EU/UK Driving Regulations</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="space-y-2">
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <p className="font-medium">Daily Driving Limit</p>
                  <p className="text-muted-foreground">Maximum 9 hours (can extend to 10 hours twice per week)</p>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <p className="font-medium">Weekly Driving Limit</p>
                  <p className="text-muted-foreground">Maximum 56 hours in any single week</p>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <p className="font-medium">Fortnightly Limit</p>
                  <p className="text-muted-foreground">Maximum 90 hours in any two consecutive weeks</p>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <p className="font-medium">Break Requirements</p>
                  <p className="text-muted-foreground">45-minute break after 4.5 hours of driving</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Duty Status</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="flex gap-2 flex-wrap">
                <Badge className="bg-green-500">Driving</Badge>
                <Badge className="bg-blue-500">On-Duty (Other Work)</Badge>
                <Badge className="bg-yellow-500">Off-Duty</Badge>
                <Badge className="bg-purple-500">Sleeper Berth</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'billing',
      title: 'Customer Billing',
      icon: <CreditCard className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
            Customer Billing Portal Guide
          </h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purpose & Benefits</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>Manage customer relationships and billing:</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Customer contract management</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Rate configuration per customer</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Revenue analytics</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Profitability analysis per customer</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Customer Management</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>For each customer, track:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Company name and contact details</li>
                <li>Contract start and end dates</li>
                <li>Rate structure (per mile, per hour, per job)</li>
                <li>Payment terms</li>
                <li>Credit limit</li>
                <li>Notes and special requirements</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Rate Types</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid gap-2 md:grid-cols-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-center">
                  <p className="font-medium">Per Mile</p>
                  <p className="text-xs text-muted-foreground">£X.XX per mile travelled</p>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-center">
                  <p className="font-medium">Per Hour</p>
                  <p className="text-xs text-muted-foreground">£X.XX per hour of work</p>
                </div>
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-center">
                  <p className="font-medium">Fixed Rate</p>
                  <p className="text-xs text-muted-foreground">Set price per job</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'appendix',
      title: 'Appendix & Reference',
      icon: <FileText className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-2">Appendix & Technical Reference</h2>
            <p className="text-purple-100">Language Support, System Verification & Test Scenarios</p>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-500" />
                Translation System - 19 Languages Supported
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                      <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left">Language</th>
                      <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left">Code</th>
                      <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left">Coverage</th>
                      <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">English (US)</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">en-US</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">13 categories</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1"><Badge className="bg-green-500">Full</Badge></td></tr>
                    <tr><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">English (UK)</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">en-GB</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">13 categories</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1"><Badge className="bg-green-500">Full</Badge></td></tr>
                    <tr><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">German</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">de-DE</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">13 categories</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1"><Badge className="bg-green-500">Full</Badge></td></tr>
                    <tr><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">Spanish</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">es-ES</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">13 categories</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1"><Badge className="bg-green-500">Full</Badge></td></tr>
                    <tr><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">Italian</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">it-IT</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">13 categories</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1"><Badge className="bg-green-500">Full</Badge></td></tr>
                    <tr><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">Japanese</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">ja-JP</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">13 categories</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1"><Badge className="bg-green-500">Full</Badge></td></tr>
                    <tr><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">Polish</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">pl-PL</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">13 categories</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1"><Badge className="bg-green-500">Full</Badge></td></tr>
                    <tr><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">Portuguese (Brazil)</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">pt-BR</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">13 categories</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1"><Badge className="bg-green-500">Full</Badge></td></tr>
                    <tr><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">Romanian</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">ro-RO</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">13 categories</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1"><Badge className="bg-green-500">Full</Badge></td></tr>
                    <tr><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">Chinese (Simplified)</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">zh-CN</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">13 categories</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1"><Badge className="bg-green-500">Full</Badge></td></tr>
                    <tr className="bg-gray-50 dark:bg-gray-900"><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">Arabic</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">ar-SA</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">9 categories</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1"><Badge className="bg-blue-500">Core</Badge></td></tr>
                    <tr className="bg-gray-50 dark:bg-gray-900"><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">French</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">fr-FR</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">9 categories</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1"><Badge className="bg-blue-500">Core</Badge></td></tr>
                    <tr className="bg-gray-50 dark:bg-gray-900"><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">Hindi</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">hi-IN</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">9 categories</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1"><Badge className="bg-blue-500">Core</Badge></td></tr>
                    <tr className="bg-gray-50 dark:bg-gray-900"><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">Korean</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">ko-KR</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">9 categories</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1"><Badge className="bg-blue-500">Core</Badge></td></tr>
                    <tr className="bg-gray-50 dark:bg-gray-900"><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">Dutch</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">nl-NL</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">9 categories</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1"><Badge className="bg-blue-500">Core</Badge></td></tr>
                    <tr className="bg-gray-50 dark:bg-gray-900"><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">Russian</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">ru-RU</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">9 categories</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1"><Badge className="bg-blue-500">Core</Badge></td></tr>
                    <tr className="bg-gray-50 dark:bg-gray-900"><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">Turkish</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">tr-TR</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1">9 categories</td><td className="border border-gray-200 dark:border-gray-700 px-3 py-1"><Badge className="bg-blue-500">Core</Badge></td></tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-muted-foreground text-xs">
                <strong>Categories:</strong> app, navigation, vehicle, route, facilities, legal, subscription, common, amazon, voice, settings, languages, fleet
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Fleet Management Test Scenario - PASSED
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <p>The following test scenario was executed to verify all Fleet Management System functions:</p>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-bold text-green-800 dark:text-green-200 mb-3">Test Data Created:</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <Truck className="w-4 h-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Test Vehicle</p>
                      <p className="text-xs text-muted-foreground">Volvo FH16 (TEST-TRK-001)</p>
                      <p className="text-xs text-green-600">Created Successfully</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Test Driver</p>
                      <p className="text-xs text-muted-foreground">John TestDriver (TESTLIC12345, C+E)</p>
                      <p className="text-xs text-green-600">Created Successfully</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Wrench className="w-4 h-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Service Record</p>
                      <p className="text-xs text-muted-foreground">MOT inspection, £150.00</p>
                      <p className="text-xs text-green-600">Created Successfully</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Fuel className="w-4 h-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Fuel Log</p>
                      <p className="text-xs text-muted-foreground">400L diesel, £580.00, BP Motorway</p>
                      <p className="text-xs text-green-600">Created Successfully</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-2">Database Tables Verified (10 Total):</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                  <Badge variant="outline" className="justify-center">fleet_vehicles</Badge>
                  <Badge variant="outline" className="justify-center">operators</Badge>
                  <Badge variant="outline" className="justify-center">service_records</Badge>
                  <Badge variant="outline" className="justify-center">fuel_logs</Badge>
                  <Badge variant="outline" className="justify-center">customer_billing</Badge>
                  <Badge variant="outline" className="justify-center">driver_behavior</Badge>
                  <Badge variant="outline" className="justify-center">geofences</Badge>
                  <Badge variant="outline" className="justify-center">geofence_events</Badge>
                  <Badge variant="outline" className="justify-center">hours_of_service</Badge>
                  <Badge variant="outline" className="justify-center">traffic_incidents</Badge>
                </div>
              </div>

              <p className="text-xs text-muted-foreground italic">
                Test data was created, verified for correct associations between vehicle, driver, service, and fuel records, then cleaned up after successful verification.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Fleet UI Tabs (14 Total)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge>Vehicles</Badge>
                <Badge>Operators</Badge>
                <Badge>Service</Badge>
                <Badge>Fuel</Badge>
                <Badge>Documents</Badge>
                <Badge>Analytics</Badge>
                <Badge>Incidents</Badge>
                <Badge>Trips</Badge>
                <Badge>Compliance</Badge>
                <Badge>Fleet Tracking</Badge>
                <Badge>Geofencing</Badge>
                <Badge>Driver Behavior</Badge>
                <Badge>Hours of Service</Badge>
                <Badge>Customer Billing</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
  ];

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[600px]">
      {/* Table of Contents Sidebar */}
      <Card className="w-64 flex-shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            User Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="p-2 space-y-1">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-muted-foreground'
                  }`}
                >
                  {section.icon}
                  <span className="truncate">{section.title}</span>
                  {activeSection === section.id && (
                    <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      <Card className="flex-1">
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="p-6">
              {sections.find(s => s.id === activeSection)?.content}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
