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
  Smartphone, Monitor, Globe, Zap, Lock, Bell, Route, Search,
  Video, Camera, HardDrive, Gauge, ClipboardCheck, Timer
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
                <div className="p-2 bg-slate-50 dark:bg-slate-900/20 rounded col-span-2 md:col-span-1">
                  <p className="font-medium">Information Security (ISMS)</p>
                  <p className="text-xs text-muted-foreground">ISO 27001:2022 & ISO 27005 compliance</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── ISMS & ISO 27001 ── */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white p-5 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Lock className="w-6 h-6 text-blue-300" />
              <h3 className="text-lg font-bold">Information Security Management System (ISMS)</h3>
            </div>
            <p className="text-slate-300 text-sm">ISO 27001:2022 & ISO 27005 — Built into your Fleet Management platform</p>
          </div>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-slate-600" />
                What is an ISMS?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>
                An <strong>Information Security Management System (ISMS)</strong> is a systematic framework of policies, 
                procedures, and controls that protect your organisation's information assets from threats such as data breaches, 
                cyber attacks, and accidental loss.
              </p>
              <p>
                <strong>ISO 27001:2022</strong> is the internationally recognised standard for ISMS certification. 
                Achieving certification demonstrates to customers, partners, and regulators that your organisation 
                manages information security to the highest professional standard.
              </p>
              <p>
                <strong>ISO 27005</strong> is the companion risk management standard. It provides the methodology 
                for identifying, assessing, and treating information security risks — the risk register you complete 
                in TruckNav feeds directly into your ISO 27001 certification evidence.
              </p>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="font-medium text-blue-700 dark:text-blue-300 text-xs mb-1">Key Distinction</p>
                <p className="text-xs text-muted-foreground">
                  ISO 27001 is a <strong>certifiable standard</strong> — your organisation can be independently audited 
                  and awarded a certificate. ISO 27005 is a <strong>guidance document</strong> only; no certificate 
                  is issued for it. You use ISO 27005 methodology to satisfy ISO 27001's risk assessment requirements.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-green-600" />
                ISMS Module — 6 Built-In Sections
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>Access the ISMS tab in Fleet Management to manage all six areas of your information security programme:</p>
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Badge className="bg-blue-600 shrink-0 mt-0.5">1</Badge>
                  <div>
                    <p className="font-medium">Compliance Overview</p>
                    <p className="text-xs text-muted-foreground">Live ISO 27001 compliance score (%), certification roadmap, controls implemented vs in-progress, open risks count, and an actions-required panel. The score updates automatically as you complete controls in the Annex A checklist.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Badge className="bg-orange-600 shrink-0 mt-0.5">2</Badge>
                  <div>
                    <p className="font-medium">Risk Register (ISO 27005)</p>
                    <p className="text-xs text-muted-foreground">Log all information security risks with Likelihood × Impact scoring (1–5 each). The system calculates a risk score automatically and assigns a level: Critical, High, Medium, or Low. Each risk has a treatment plan, owner, status, and review date.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Badge className="bg-red-600 shrink-0 mt-0.5">3</Badge>
                  <div>
                    <p className="font-medium">Security Incidents</p>
                    <p className="text-xs text-muted-foreground">Log all security incidents separately from road incidents. Track severity, containment steps, and resolution notes. Status workflow: Open → Investigating → Resolved → Closed. Required evidence for ISO 27001 Clause 10 (Improvement).</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Badge className="bg-purple-600 shrink-0 mt-0.5">4</Badge>
                  <div>
                    <p className="font-medium">Information Asset Register</p>
                    <p className="text-xs text-muted-foreground">Inventory every information asset: Hardware, Software, Data, People, Facility, or Service. Each asset has a data classification (Public / Internal / Confidential / Restricted) and a criticality rating. Required by ISO 27001 Annex A 5.9 and 5.10.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Badge className="bg-green-600 shrink-0 mt-0.5">5</Badge>
                  <div>
                    <p className="font-medium">Policy Management</p>
                    <p className="text-xs text-muted-foreground">Track all security policies by version, owner, and review date. A progress bar shows what percentage of staff have acknowledged each policy. Required by ISO 27001 Clause 5.2 (Policy) and Annex A 5.1.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Badge className="bg-slate-600 shrink-0 mt-0.5">6</Badge>
                  <div>
                    <p className="font-medium">ISO 27001:2022 Annex A Controls Checklist</p>
                    <p className="text-xs text-muted-foreground">A full checklist of the 22 Annex A control categories applicable to your fleet operations. Mark each as Implemented, Partial, Planned, or Not Applicable. Evidence notes are pre-mapped where TruckNav already provides the control. Each status feeds back into the compliance score on the Overview tab.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                ISO 27005 — Risk Management Methodology
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>The Risk Register follows the ISO 27005 risk assessment process:</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <p className="font-medium text-orange-700 dark:text-orange-300">Step 1: Asset Identification</p>
                  <p className="text-xs text-muted-foreground mt-1">Identify the information asset at risk (from your Asset Register)</p>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <p className="font-medium text-orange-700 dark:text-orange-300">Step 2: Threat & Vulnerability</p>
                  <p className="text-xs text-muted-foreground mt-1">Document the threat (e.g. ransomware) and the vulnerability it exploits</p>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <p className="font-medium text-orange-700 dark:text-orange-300">Step 3: Risk Scoring</p>
                  <p className="text-xs text-muted-foreground mt-1">Score Likelihood (1–5) × Impact (1–5). Score 1–6 = Low, 7–12 = Medium, 13–19 = High, 20–25 = Critical</p>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <p className="font-medium text-orange-700 dark:text-orange-300">Step 4: Treatment Decision</p>
                  <p className="text-xs text-muted-foreground mt-1">Choose a treatment: Mitigate (add a control), Accept, Avoid, or Transfer (insurance)</p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/20 rounded-lg text-xs text-muted-foreground">
                <strong>Risk Score Reference:</strong> Critical (20–25) — immediate action required. 
                High (13–19) — action within 30 days. Medium (7–12) — action within 90 days. 
                Low (1–6) — monitor and review annually.
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                ISO 27001:2022 Annex A — Key Controls for Fleet Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>ISO 27001:2022 Annex A contains 93 controls across 4 themes. The most relevant to a fleet technology company are:</p>
              <div className="space-y-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="font-medium text-blue-700 dark:text-blue-300">Organisational Controls (5.x)</p>
                  <p className="text-xs text-muted-foreground">Information security policies, roles & responsibilities, supplier relationships, incident management, and business continuity. TruckNav's Policy Management section covers 5.1, 5.2, and 5.31.</p>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="font-medium text-green-700 dark:text-green-300">People Controls (6.x)</p>
                  <p className="text-xs text-muted-foreground">Background checks, security awareness training, and clear desk/screen policies for office and cab environments. Driver device policy is a key evidence item.</p>
                </div>
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="font-medium text-yellow-700 dark:text-yellow-300">Physical Controls (7.x)</p>
                  <p className="text-xs text-muted-foreground">Physical security of offices, server rooms, and in-cab devices. Vehicle cab security policy and device encryption are primary evidence items for fleet organisations.</p>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="font-medium text-purple-700 dark:text-purple-300">Technological Controls (8.x)</p>
                  <p className="text-xs text-muted-foreground">Access control (8.2–8.5), encryption (8.24), secure development (8.25–8.31), backup (8.13), network security (8.20–8.22), and vulnerability management (8.8). TruckNav's cloud infrastructure addresses several of these via Neon DB encryption and HTTPS.</p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/20 rounded-lg text-xs text-muted-foreground">
                <strong>Statement of Applicability (SoA):</strong> During an ISO 27001 audit, you must produce a SoA documenting every Annex A control and whether it applies to your organisation. The Annex A checklist in TruckNav's ISMS tab is your working SoA document. Mark controls as Not Applicable only where you can justify the exclusion in writing.
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Certification Roadmap — Target Q1 2027
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                  <div>
                    <p className="font-medium">Gap Analysis <span className="text-xs text-muted-foreground font-normal">— Q1–Q2 2026</span></p>
                    <p className="text-xs text-muted-foreground">Complete the Annex A checklist in TruckNav to identify gaps. Use the Risk Register to log all identified risks. Target: 100% controls assessed.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                  <div>
                    <p className="font-medium">Policy Development <span className="text-xs text-muted-foreground font-normal">— Q2–Q3 2026</span></p>
                    <p className="text-xs text-muted-foreground">Write and publish all mandatory policies. Minimum required: Information Security Policy, Acceptable Use, Access Control, Incident Response, and Business Continuity. Record acknowledgements in TruckNav.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
                  <div>
                    <p className="font-medium">Controls Implementation <span className="text-xs text-muted-foreground font-normal">— Q3–Q4 2026</span></p>
                    <p className="text-xs text-muted-foreground">Implement all controls identified in the gap analysis. Update the Annex A checklist status to Implemented as each control goes live. Target: 80%+ implemented before Stage 1 audit.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">4</div>
                  <div>
                    <p className="font-medium">Internal Audit <span className="text-xs text-muted-foreground font-normal">— Q4 2026</span></p>
                    <p className="text-xs text-muted-foreground">Conduct an internal audit of the entire ISMS. Log any non-conformities as security incidents in TruckNav. Corrective actions must be evidenced before Stage 2.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">5</div>
                  <div>
                    <p className="font-medium">Certification Audit — Stage 1 & 2 <span className="text-xs text-muted-foreground font-normal">— Q1 2027</span></p>
                    <p className="text-xs text-muted-foreground">Stage 1 (document review): Auditor reviews your ISMS documentation including policies, risk register, and SoA. Stage 2 (on-site): Auditor verifies controls are implemented and operating effectively. TruckNav ISMS records serve as primary audit evidence.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-slate-500" />
                Using TruckNav as Audit Evidence
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>An ISO 27001 auditor will expect to see documented evidence for every control. TruckNav provides this evidence directly:</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs mt-2">
                  <thead>
                    <tr className="border-b bg-gray-50 dark:bg-gray-800">
                      <th className="text-left py-2 px-2">Auditor Will Ask For</th>
                      <th className="text-left py-2 px-2">TruckNav Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr><td className="py-2 px-2">Risk assessment records</td><td className="py-2 px-2 text-muted-foreground">Risk Register with L×I scores</td></tr>
                    <tr><td className="py-2 px-2">Asset inventory</td><td className="py-2 px-2 text-muted-foreground">Information Asset Register</td></tr>
                    <tr><td className="py-2 px-2">Policy acknowledgements</td><td className="py-2 px-2 text-muted-foreground">Policy Management — staff sign-off %</td></tr>
                    <tr><td className="py-2 px-2">Statement of Applicability</td><td className="py-2 px-2 text-muted-foreground">Annex A Controls Checklist</td></tr>
                    <tr><td className="py-2 px-2">Incident log</td><td className="py-2 px-2 text-muted-foreground">Security Incidents register</td></tr>
                    <tr><td className="py-2 px-2">Compliance monitoring</td><td className="py-2 px-2 text-muted-foreground">Compliance Overview score & roadmap</td></tr>
                  </tbody>
                </table>
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
                <Badge>Tachograph Compliance</Badge>
                <Badge>Vehicle Checklist</Badge>
                <Badge>Dash Cam</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-purple-500" />
                Key Features - Native / Capacitor App Export
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <p className="text-muted-foreground">Complete feature manifest for packaging TruckNav Pro as a native mobile application via Capacitor or equivalent framework. All features listed are implemented and production-ready.</p>

              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-blue-600 mb-2 flex items-center gap-2">
                    <Navigation className="w-4 h-4" />
                    Navigation & Routing
                  </h4>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>TomTom Truck Routing API with HGV-specific parameters (height, width, weight, length, axle count)</li>
                    <li>GraphHopper fallback routing engine for redundancy</li>
                    <li>Dynamic Car vs HGV route calculation mode switching</li>
                    <li>Turn-by-turn voice navigation with 17+ language support</li>
                    <li>Lane guidance with visual turn indicators and voice announcements</li>
                    <li>Automatic off-route rerouting with restriction avoidance</li>
                    <li>Dynamic alternative route suggestions during navigation</li>
                    <li>3-mode workflow: Plan, Preview, Navigate</li>
                    <li>Route preview with trip summary (distance, time, fuel estimate)</li>
                    <li>Smart Traffic Light Integration with green wave optimisation</li>
                    <li>Customisable dashboard widgets for real-time navigation data</li>
                    <li>Staggered zoom system with zoom lock during navigation</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-blue-600 mb-2 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Mapping & Visualisation
                  </h4>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>MapLibre GL JS GPU-accelerated vector map engine</li>
                    <li>Leaflet fallback map rendering</li>
                    <li>Google Maps satellite imagery tiles</li>
                    <li>OpenStreetMap standard tiles</li>
                    <li>3D building extrusions at zoom level 14+</li>
                    <li>3D navigation mode with pitch camera</li>
                    <li>Day / Night / Auto theme modes</li>
                    <li>Persistent tile sources with multi-CDN optimisation</li>
                    <li>AR Navigation Overlay (camera-based augmented reality view)</li>
                    <li>Interactive 3D map controls with compass bearing</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-blue-600 mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Real-Time Traffic
                  </h4>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>Triple-stream traffic data: TomTom Live + HERE API + Mapbox fallback</li>
                    <li>3-layer route traffic visualisation (base line, colour overlay, incident icons)</li>
                    <li>TomTom Traffic Incidents API for verified incident data</li>
                    <li>Crowdsourced incident reporting with voice commands</li>
                    <li>Traffic colour scheme: Blue (free flow), Green (light), Yellow (moderate), Orange (heavy), Red (standstill)</li>
                    <li>Dynamic travel time recalculation based on traffic conditions</li>
                    <li>In-memory caching system for traffic data efficiency</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-blue-600 mb-2 flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    Voice & Audio System
                  </h4>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>Unified NavigationVoice singleton for all announcements</li>
                    <li>Female English voice default with 17 language support</li>
                    <li>Modes: Motorway-Only, Junction & Lane Guidance, Emergency Traffic</li>
                    <li>Bluetooth / CarPlay / Android Auto audio routing</li>
                    <li>Silent audio warmup and AudioContext resumption</li>
                    <li>Speech synthesis priming for vehicle connectivity</li>
                    <li>Customisable alert sounds via Web Audio API</li>
                    <li>Mute All Alerts quick-access button with state persistence</li>
                    <li>Voice commands for hands-free incident reporting</li>
                    <li>Dynamic language switching matching i18n settings</li>
                    <li>Haptic feedback via Vibration API</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-blue-600 mb-2 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Search & POI Discovery
                  </h4>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>TomTom Search API for worldwide address autocomplete</li>
                    <li>Truck-specific POI search with fuzzy matching</li>
                    <li>Robust geocoding and reverse geocoding</li>
                    <li>Recent destinations history</li>
                    <li>Fuel price comparison from nearby stations</li>
                    <li>Truck-friendly facility discovery (truck stops, rest areas, parking)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-blue-600 mb-2 flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Vehicle Management
                  </h4>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>Class 1 Truck and Car vehicle profile switching</li>
                    <li>Custom vehicle dimensions (height, width, weight, length)</li>
                    <li>Intelligent restriction avoidance based on vehicle parameters</li>
                    <li>Critical violation detection and dimensional checking</li>
                    <li>Pre-trip vehicle inspection checklist (8 categories, DVSA-aligned)</li>
                    <li>Inspection timer with duration recording</li>
                    <li>Digital inspection records with audit trail</li>
                    <li>CSV export of inspection records</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-blue-600 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Safety & Compliance
                  </h4>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>Working Time Directive compliance warnings</li>
                    <li>Tachograph compliance tracking (infringements, scoring, severity)</li>
                    <li>Driver hours monitoring with break reminders</li>
                    <li>Speed limit display with customisable alerts</li>
                    <li>Restriction warning system for bridges, tunnels, weight limits</li>
                    <li>Fatigue/break reminder notifications</li>
                    <li>Dash cam integration support</li>
                    <li>Disclaimer: NOT a certified ELD or digital tachograph</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-blue-600 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Fleet Management (Desktop)
                  </h4>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>17-tab enterprise management system</li>
                    <li>Vehicle Registry with full specifications tracking</li>
                    <li>Operator Management with licence and qualification tracking</li>
                    <li>Service Records with cost tracking and scheduling</li>
                    <li>Fuel Consumption analytics and logging</li>
                    <li>Document Management with expiry tracking</li>
                    <li>Cost Analytics with trend charts</li>
                    <li>Incident Logging and investigation tracking</li>
                    <li>Trip Tracking with route history</li>
                    <li>Compliance & Regulatory Tracking</li>
                    <li>Real-Time Fleet Tracking on map</li>
                    <li>Geofencing with entry/exit alerts</li>
                    <li>Driver Behaviour Analytics with scoring</li>
                    <li>Hours of Service (HoS) compliance monitoring</li>
                    <li>Customer Billing Portal</li>
                    <li>Tachograph Compliance with CSV export</li>
                    <li>Vehicle Inspections history with CSV export</li>
                    <li>Dash Cam management</li>
                    <li>Fleet Broadcast Messaging (Critical/Important/Info priorities)</li>
                    <li>Shift Management (check-in/out, handover notes, performance scoring)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-blue-600 mb-2 flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Mobile & PWA Features
                  </h4>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>Progressive Web App with offline support</li>
                    <li>iOS enhancements and safe area handling</li>
                    <li>Automatic update detection</li>
                    <li>Offline cached routes, restrictions, and facilities</li>
                    <li>Mobile-first design with touch-optimised targets</li>
                    <li>MobileFAB for one-handed operation</li>
                    <li>Full-screen route planner</li>
                    <li>Compact trip strip display</li>
                    <li>Responsive CSS clamp() density tokens</li>
                    <li>Device orientation support for AR view</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-blue-600 mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Internationalisation
                  </h4>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>19 languages supported (10 full, 9 core coverage)</li>
                    <li>13 translation categories per language</li>
                    <li>Dynamic voice language switching</li>
                    <li>Multilingual user guide</li>
                    <li>RTL support for Arabic</li>
                    <li>Locale-aware date, time, and number formatting</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-blue-600 mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Subscription & Authentication
                  </h4>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>Stripe-powered subscription management (£69/12 months)</li>
                    <li>Replit Auth (OIDC) authentication with session management</li>
                    <li>Access control with subscription verification</li>
                    <li>PostgreSQL session storage</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-blue-600 mb-2 flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    Data & Backend
                  </h4>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>Node.js + Express.js backend with TypeScript</li>
                    <li>PostgreSQL (Neon serverless) with Drizzle ORM</li>
                    <li>Full REST API with Zod validation</li>
                    <li>TanStack React Query for server state management</li>
                    <li>React Context for local UI state</li>
                    <li>React Hook Form with Zod resolver for forms</li>
                    <li>Wouter for client-side routing</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-purple-600 mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Capacitor / Native App Migration Notes
                  </h4>
                  <p className="text-xs text-muted-foreground mb-1">The following are recommendations when converting to a native app. These are NOT current features but suggested plugins for enhanced native capabilities.</p>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>All UI rendering is web-based (React + MapLibre GL) - fully Capacitor-compatible</li>
                    <li>Geolocation via Browser API (replace with Capacitor Geolocation plugin for native accuracy)</li>
                    <li>Camera access for AR overlay (replace with Capacitor Camera plugin if needed)</li>
                    <li>Speech synthesis via Web Speech API (works in native WebView)</li>
                    <li>Speech recognition via Web Speech API (may need native plugin on iOS)</li>
                    <li>Vibration API for haptic feedback (replace with Capacitor Haptics plugin)</li>
                    <li>Device Orientation for AR (replace with Capacitor Motion plugin)</li>
                    <li>Local Storage / IndexedDB for offline caching (replace with Capacitor Preferences/Filesystem)</li>
                    <li>Push notifications: Add Capacitor Push Notifications plugin</li>
                    <li>Background location tracking: Add Capacitor Background Geolocation plugin</li>
                    <li>Keep screen awake during navigation: Add Capacitor Keep Awake plugin</li>
                    <li>Bluetooth audio: Native WebView handles audio routing automatically</li>
                    <li>App store metadata: Use features list above for store description</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'tachograph',
      title: 'Tachograph Compliance',
      icon: <Gauge className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Gauge className="w-6 h-6 text-blue-600" />
            Tachograph Compliance Guide
          </h2>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Important Disclaimer:</strong> This tracking system is a driver aid only and is NOT a certified ELD (Electronic Logging Device) under FMCSA regulations or a certified digital tachograph. For legal compliance, you must use certified equipment registered with the appropriate regulatory authority (FMCSA, DVSA, or equivalent).
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purpose & Overview</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>The Tachograph Compliance tab helps fleet managers track and manage EU/UK drivers' hours infringements. It provides a centralised record of all tachograph-related violations across your fleet.</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Track infringements per driver with severity ratings</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Rolling 12-month compliance scoring for each driver</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Record fines and track payment status</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Export records to CSV for auditing and reporting</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Dashboard Overview Cards
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>Four summary cards at the top provide an instant fleet compliance snapshot:</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <Shield className="w-4 h-4 text-green-500 mt-0.5" />
                  <div><strong>Fleet Compliance Score:</strong> Average score across all drivers. Green (80%+) = Excellent, Yellow (60-79%) = Needs attention, Orange (40-59%) = At risk, Red (below 40%) = Critical.</div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <AlertTriangle className="w-4 h-4 text-blue-500 mt-0.5" />
                  <div><strong>Total Infringements:</strong> Total number of recorded infringements in the rolling 12-month window.</div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5" />
                  <div><strong>Serious / Very Serious:</strong> Count of higher severity violations that require immediate management attention.</div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CreditCard className="w-4 h-4 text-red-500 mt-0.5" />
                  <div><strong>Total Fines:</strong> Cumulative fine amount across all recorded infringements.</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Driver Compliance Scores
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>Each driver starts at 100% and loses points for each infringement recorded in the past 12 months. Drivers are ranked from highest to lowest score.</p>
              <div className="space-y-2">
                <p className="font-medium">Score Calculation:</p>
                <ul className="space-y-1 pl-4">
                  <li>Each driver begins at 100 points</li>
                  <li>Points are deducted based on infringement severity</li>
                  <li>Only infringements from the last 12 months count</li>
                  <li>Score cannot go below 0%</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Infringement Types & Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>Infringements are organised into categories with associated penalty points:</p>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-blue-600 mb-1">Driving Time Violations</p>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>Daily Driving Exceeded (9hr/10hr) - 15 points</li>
                    <li>Continuous Driving Exceeded (4.5hr) - 10 points</li>
                    <li>Weekly Driving Exceeded (56hr) - 20 points</li>
                    <li>Fortnightly Driving Exceeded (90hr) - 25 points</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-blue-600 mb-1">Break Violations</p>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>Insufficient Break (less than 45min) - 8 points</li>
                    <li>Break at Wrong Time - 5 points</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-blue-600 mb-1">Rest Period Violations</p>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>Insufficient Daily Rest (less than 11hr) - 12 points</li>
                    <li>Insufficient Weekly Rest (less than 45hr) - 18 points</li>
                    <li>Missed Compensation Rest - 15 points</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-blue-600 mb-1">Card / Recording Violations</p>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>Missing Card Entries - 8 points</li>
                    <li>Wrong Activity Mode - 5 points</li>
                    <li>Driving Without Card - 20 points</li>
                    <li>Fraudulent Multiple Cards - 50 points</li>
                    <li>Record Tampering - 50 points</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-blue-600 mb-1">Other Violations</p>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>Unreported Vehicle Unit Fault - 10 points</li>
                    <li>Missing Required Printouts - 5 points</li>
                    <li>Other Infringement - 5 points</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Severity Levels
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Each infringement is classified by severity for prioritisation:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-100 text-yellow-800">Minor</Badge>
                  <span>Low-impact violations, typically procedural oversights</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-100 text-orange-800">Serious</Badge>
                  <span>Significant violations requiring corrective action</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-100 text-red-800">Very Serious</Badge>
                  <span>Critical violations with potential legal consequences</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">How to Use</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <p className="font-medium">Record an Infringement</p>
                    <p className="text-muted-foreground">Click "Record Infringement" to log a new violation. Select the driver, infringement type, date, severity, and optionally enter fine amount and notes.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <p className="font-medium">Filter by Driver</p>
                    <p className="text-muted-foreground">Use the driver dropdown filter above the records table to view infringements for a specific driver or all drivers.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <p className="font-medium">Edit or Delete Records</p>
                    <p className="text-muted-foreground">Use the edit (pencil) icon to update infringement details or the delete (bin) icon to remove a record. Deletion requires confirmation.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-medium">4</div>
                  <div>
                    <p className="font-medium">Export to CSV</p>
                    <p className="text-muted-foreground">Click "Export" to download all filtered infringement records as a CSV file for external auditing, reporting, or sharing with authorities.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Infringement Record Fields</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="mb-2">Each record in the infringement table shows:</p>
              <ul className="space-y-1 pl-4">
                <li><strong>Date:</strong> When the infringement occurred</li>
                <li><strong>Driver:</strong> The operator who committed the violation</li>
                <li><strong>Infringement Type:</strong> Category and description of the violation</li>
                <li><strong>Severity:</strong> Minor, Serious, or Very Serious</li>
                <li><strong>Points:</strong> Penalty points deducted from the driver's compliance score</li>
                <li><strong>Fine:</strong> Financial penalty amount (if applicable) with paid/unpaid status</li>
                <li><strong>Reported By:</strong> Person who recorded the infringement</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'vehicle-checklist',
      title: 'Vehicle Checklist',
      icon: <ClipboardCheck className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-blue-600" />
            Pre-Trip Vehicle Inspection Checklist
          </h2>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purpose & Legal Requirement</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>Under UK and EU law, drivers of HGVs must carry out a daily walk-around check before driving. The Pre-Trip Inspection Checklist in TruckNav Pro provides a structured, digital way to complete and record these checks.</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Meets DVSA daily walk-around check requirements</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Digital records with timestamps for audit trail</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Linked to specific vehicle and driver</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Time-tracked inspections with duration recording</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Inspection Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>The checklist is organised into 8 inspection categories covering all critical vehicle areas:</p>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-blue-600 mb-1">1. Exterior Checks</p>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>All mirrors clean and properly adjusted</li>
                    <li>Windscreen clean, no cracks or damage</li>
                    <li>Windscreen wipers and washers working</li>
                    <li>Bodywork - no damage or sharp edges</li>
                    <li>Number plates clean and visible</li>
                    <li>Fuel cap secure</li>
                    <li>Exhaust system secure, no leaks</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-blue-600 mb-1">2. Cab & Controls</p>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>Seat belt functioning correctly</li>
                    <li>Seat and steering adjustment working</li>
                    <li>Horn working</li>
                    <li>Heater and demister working</li>
                    <li>Dashboard warning lights checked</li>
                    <li>Speedometer and tachograph working</li>
                    <li>Steering - no excessive play</li>
                    <li>Clutch and brake pedals operating correctly</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-blue-600 mb-1">3. Lights & Signals</p>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>Headlights (dipped and main beam), side lights, rear lights</li>
                    <li>Brake lights, all indicators (front, side, rear)</li>
                    <li>Hazard warning lights, reverse lights, fog lights</li>
                    <li>Marker lights and reflectors clean and working</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-blue-600 mb-1">4. Tyres & Wheels</p>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>Tyre pressures checked (visual inspection)</li>
                    <li>Tyre condition - no cuts, bulges or damage</li>
                    <li>Tyre tread depth adequate (minimum 1mm)</li>
                    <li>Wheel nuts secure, spare wheel serviceable</li>
                    <li>Mudflaps and spray suppression fitted</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-blue-600 mb-1">5. Brakes & Safety</p>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>Service brake operation checked</li>
                    <li>Parking brake holding</li>
                    <li>Air pressure building correctly</li>
                    <li>ABS warning light functioning</li>
                    <li>Brake lines - no visible leaks or damage</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-blue-600 mb-1">6. Trailer Checks</p>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>Trailer coupling secure</li>
                    <li>Trailer brakes connected and working</li>
                    <li>Trailer lights all working</li>
                    <li>Landing legs raised and secure</li>
                    <li>Trailer tyres - condition and pressure</li>
                    <li>Load secure and within weight limits</li>
                    <li>Doors and curtains/body secure</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-blue-600 mb-1">7. Tail Lift</p>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>Tail lift operating correctly</li>
                    <li>Tail lift controls working</li>
                    <li>Tail lift safety devices working</li>
                    <li>Tail lift stowed and secured</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-blue-600 mb-1">8. Documents & Equipment</p>
                  <ul className="space-y-1 pl-4 text-xs">
                    <li>Driving licence carried</li>
                    <li>Vehicle documents (V5, insurance, MOT)</li>
                    <li>Tachograph card inserted</li>
                    <li>Warning triangle, hi-visibility vest present</li>
                    <li>Fire extinguisher present and in date</li>
                    <li>First aid kit present</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">How to Complete an Inspection</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <p className="font-medium">Access the Checklist</p>
                    <p className="text-muted-foreground">On mobile, open the menu and go to Settings. Select a vehicle and driver, then tap "Start Inspection" to begin. You must have both a vehicle and driver selected.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <p className="font-medium">Walk Around the Vehicle</p>
                    <p className="text-muted-foreground">Work through each category systematically. Tap each checkbox as you inspect that item. Categories can be expanded or collapsed for easy navigation.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <p className="font-medium">Add Notes</p>
                    <p className="text-muted-foreground">Use the notes field at the bottom to record any defects, issues, or observations that need attention or follow-up.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-medium">4</div>
                  <div>
                    <p className="font-medium">Submit Inspection</p>
                    <p className="text-muted-foreground">Once all items are checked, tap "Submit Inspection". The system records the time taken, all checked items, and any notes. The inspection is linked to the vehicle and driver.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Timer className="w-5 h-5" />
                Inspection Timer
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>A built-in timer starts when you open the checklist and records the total duration of your inspection. This provides:</p>
              <ul className="space-y-1 pl-4">
                <li>Evidence that a thorough inspection was completed (not rushed)</li>
                <li>Duration records visible in the fleet management inspection history</li>
                <li>Helps fleet managers identify unusually quick inspections that may need review</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Fleet Manager: Inspection History
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>Fleet managers can review all completed inspections in the Vehicle Inspections tab within Fleet Management:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span><strong>Filter:</strong> Search by vehicle, driver, or date to find specific inspections</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span><strong>View Details:</strong> Expand any inspection to see the full checklist with pass/fail for each item</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span><strong>Pass/Fail Status:</strong> Green badge for all items passed, amber warning if any items were left unchecked</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span><strong>Duration:</strong> How long the driver took to complete the inspection</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span><strong>Notes:</strong> Any defects or observations recorded by the driver</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span><strong>Export CSV:</strong> Download filtered inspection records as CSV for compliance audits and external reporting</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Best Practices</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                  <span>Complete the inspection BEFORE starting your journey - never while driving</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                  <span>Physically check each item - do not just tick boxes from the cab</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                  <span>Report any defects immediately to your transport manager</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                  <span>Do not drive with serious defects - use the notes to record and report</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                  <span>Allow adequate time (typically 10-15 minutes for a thorough check)</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'dashcam',
      title: 'Dash Cam',
      icon: <Video className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Video className="w-6 h-6 text-blue-600" />
            Dash Cam Telemetry Guide
          </h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purpose & Benefits</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>The Dash Cam feature lets you record journeys with real-time GPS overlay data:</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Record video from device camera during journeys</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>GPS coordinates overlay on video</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Speed tracking with timestamp</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Save recordings for incident review</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="w-5 h-5" />
                How to Use
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <p className="font-medium">Start Camera</p>
                    <p className="text-muted-foreground">Click "Start Camera" to enable the live preview. Grant camera permissions when prompted.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <p className="font-medium">Position Your Device</p>
                    <p className="text-muted-foreground">Mount your phone/tablet on your dashboard facing the road ahead.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <p className="font-medium">Start Recording</p>
                    <p className="text-muted-foreground">Click "Start Recording" to begin capturing video with GPS overlay.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-medium">4</div>
                  <div>
                    <p className="font-medium">Stop & Save</p>
                    <p className="text-muted-foreground">Click "Stop Recording" when finished. The video will be saved automatically.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Gauge className="w-5 h-5" />
                Telemetry Data Captured
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                  <p className="font-medium">Date & Time</p>
                  <p className="text-muted-foreground text-xs">Timestamp overlay on every frame</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                  <p className="font-medium">GPS Coordinates</p>
                  <p className="text-muted-foreground text-xs">Latitude & longitude position</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                  <p className="font-medium">Speed</p>
                  <p className="text-muted-foreground text-xs">Current speed in MPH</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                  <p className="font-medium">Heading</p>
                  <p className="text-muted-foreground text-xs">Direction of travel in degrees</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                  <p className="font-medium">Max Speed</p>
                  <p className="text-muted-foreground text-xs">Highest speed during recording</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                  <p className="font-medium">Average Speed</p>
                  <p className="text-muted-foreground text-xs">Mean speed throughout journey</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <HardDrive className="w-5 h-5" />
                Saved Recordings
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>All recordings are saved and can be managed from the recordings table:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span><strong>Play:</strong> Review recordings directly in the browser</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span><strong>Download:</strong> Save videos to your device</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span><strong>Delete:</strong> Remove old recordings to free up storage</span>
                </li>
              </ul>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                <p className="text-yellow-700 dark:text-yellow-300 text-xs">
                  <strong>Tip:</strong> Recordings include GPS track data which can be used for incident review and driver training.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Best Practices</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                  <span>Mount device securely on dashboard before starting journey</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                  <span>Ensure device is connected to power for long recordings</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                  <span>Clean camera lens regularly for best video quality</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                  <span>Review and delete old recordings periodically</span>
                </li>
              </ul>
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
