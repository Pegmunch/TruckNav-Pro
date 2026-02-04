import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle2, 
  Clock, 
  Truck, 
  AlertTriangle,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Timer,
  Calendar,
  User,
  Car
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ChecklistItem {
  id: string;
  label: string;
  category: string;
  checked: boolean;
  notes?: string;
}

interface PreTripInspectionProps {
  vehicleRegistration: string;
  operatorName: string;
  operatorId: string;
  vehicleId: string;
  onComplete: () => void;
  onBack: () => void;
}

const INSPECTION_CATEGORIES = {
  exterior: 'Exterior Checks',
  cab: 'Cab & Controls',
  lights: 'Lights & Signals',
  tyres: 'Tyres & Wheels',
  brakes: 'Brakes & Safety',
  trailer: 'Trailer Checks',
  tailLift: 'Tail Lift',
  documents: 'Documents & Equipment'
};

const CHECKLIST_ITEMS: Omit<ChecklistItem, 'checked'>[] = [
  // Exterior Checks
  { id: 'mirrors', label: 'All mirrors clean and properly adjusted', category: 'exterior' },
  { id: 'windscreen', label: 'Windscreen clean, no cracks or damage', category: 'exterior' },
  { id: 'wipers', label: 'Windscreen wipers and washers working', category: 'exterior' },
  { id: 'bodywork', label: 'Bodywork - no damage or sharp edges', category: 'exterior' },
  { id: 'numberPlates', label: 'Number plates clean and visible', category: 'exterior' },
  { id: 'fuelCap', label: 'Fuel cap secure', category: 'exterior' },
  { id: 'exhaustSystem', label: 'Exhaust system secure, no leaks', category: 'exterior' },
  
  // Cab & Controls
  { id: 'seatBelt', label: 'Seat belt functioning correctly', category: 'cab' },
  { id: 'seatAdjustment', label: 'Seat and steering adjustment working', category: 'cab' },
  { id: 'horn', label: 'Horn working', category: 'cab' },
  { id: 'heaterDemister', label: 'Heater and demister working', category: 'cab' },
  { id: 'dashWarnings', label: 'Dashboard warning lights checked', category: 'cab' },
  { id: 'speedometer', label: 'Speedometer and tachograph working', category: 'cab' },
  { id: 'steering', label: 'Steering - no excessive play', category: 'cab' },
  { id: 'clutchBrake', label: 'Clutch and brake pedals operating correctly', category: 'cab' },
  
  // Lights & Signals
  { id: 'headlights', label: 'Headlights (dipped and main beam) working', category: 'lights' },
  { id: 'sidelights', label: 'Side lights working', category: 'lights' },
  { id: 'rearLights', label: 'Rear lights working', category: 'lights' },
  { id: 'brakeLights', label: 'Brake lights working', category: 'lights' },
  { id: 'indicators', label: 'All indicators working (front, side, rear)', category: 'lights' },
  { id: 'hazards', label: 'Hazard warning lights working', category: 'lights' },
  { id: 'reverseLights', label: 'Reverse lights working', category: 'lights' },
  { id: 'fogLights', label: 'Fog lights working (front and rear)', category: 'lights' },
  { id: 'markerLights', label: 'Marker lights and reflectors clean/working', category: 'lights' },
  
  // Tyres & Wheels
  { id: 'tyrePressure', label: 'Tyre pressures checked (visual inspection)', category: 'tyres' },
  { id: 'tyreCondition', label: 'Tyre condition - no cuts, bulges or damage', category: 'tyres' },
  { id: 'tyreTread', label: 'Tyre tread depth adequate (min 1mm)', category: 'tyres' },
  { id: 'wheelNuts', label: 'Wheel nuts secure (visual check)', category: 'tyres' },
  { id: 'spareWheel', label: 'Spare wheel secure and serviceable', category: 'tyres' },
  { id: 'mudflaps', label: 'Mudflaps and spray suppression fitted', category: 'tyres' },
  
  // Brakes & Safety
  { id: 'serviceBrake', label: 'Service brake operation checked', category: 'brakes' },
  { id: 'parkingBrake', label: 'Parking brake holding', category: 'brakes' },
  { id: 'airPressure', label: 'Air pressure building correctly', category: 'brakes' },
  { id: 'absLight', label: 'ABS warning light functioning', category: 'brakes' },
  { id: 'brakeLines', label: 'Brake lines - no visible leaks or damage', category: 'brakes' },
  
  // Trailer Checks
  { id: 'trailerCoupling', label: 'Trailer coupling secure', category: 'trailer' },
  { id: 'trailerBrakes', label: 'Trailer brakes connected and working', category: 'trailer' },
  { id: 'trailerLights', label: 'Trailer lights all working', category: 'trailer' },
  { id: 'landingLegs', label: 'Landing legs raised and secure', category: 'trailer' },
  { id: 'trailerTyres', label: 'Trailer tyres - condition and pressure', category: 'trailer' },
  { id: 'loadSecure', label: 'Load secure and within weight limits', category: 'trailer' },
  { id: 'doorsSecure', label: 'Trailer doors secure', category: 'trailer' },
  { id: 'curtains', label: 'Curtains/body secure (if applicable)', category: 'trailer' },
  
  // Tail Lift
  { id: 'tailLiftOperation', label: 'Tail lift operating correctly', category: 'tailLift' },
  { id: 'tailLiftControls', label: 'Tail lift controls working', category: 'tailLift' },
  { id: 'tailLiftSafety', label: 'Tail lift safety devices working', category: 'tailLift' },
  { id: 'tailLiftSecure', label: 'Tail lift stowed and secured', category: 'tailLift' },
  
  // Documents & Equipment
  { id: 'licence', label: 'Driving licence carried', category: 'documents' },
  { id: 'vehicleDocuments', label: 'Vehicle documents (V5, insurance, MOT)', category: 'documents' },
  { id: 'tachographCard', label: 'Tachograph card inserted', category: 'documents' },
  { id: 'warningTriangle', label: 'Warning triangle present', category: 'documents' },
  { id: 'hiViz', label: 'Hi-visibility vest available', category: 'documents' },
  { id: 'fireExtinguisher', label: 'Fire extinguisher present and in date', category: 'documents' },
  { id: 'firstAidKit', label: 'First aid kit present', category: 'documents' },
];

export function PreTripInspection({
  vehicleRegistration,
  operatorName,
  operatorId,
  vehicleId,
  onComplete,
  onBack
}: PreTripInspectionProps) {
  const { t } = useTranslation();
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(
    CHECKLIST_ITEMS.map(item => ({ ...item, checked: false }))
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(INSPECTION_CATEGORIES))
  );
  const [startTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer effect
  useEffect(() => {
    if (isCompleted) return;
    
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startTime, isCompleted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleItem = (id: string) => {
    if (isCompleted) return;
    setChecklistItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const getItemsByCategory = (category: string) => {
    return checklistItems.filter(item => item.category === category);
  };

  const getCategoryProgress = (category: string) => {
    const items = getItemsByCategory(category);
    const checked = items.filter(item => item.checked).length;
    return { checked, total: items.length };
  };

  const totalChecked = checklistItems.filter(item => item.checked).length;
  const totalItems = checklistItems.length;
  const allChecked = totalChecked === totalItems;

  const handleComplete = useCallback(async () => {
    if (!allChecked || isSubmitting) return;
    
    setIsSubmitting(true);
    setIsCompleted(true);
    
    const completedAt = new Date();
    const inspectionData = {
      vehicleId,
      operatorId,
      vehicleRegistration,
      operatorName,
      startTime: startTime.toISOString(),
      completedAt: completedAt.toISOString(),
      durationSeconds: elapsedTime,
      checklistItems: checklistItems.map(item => ({
        id: item.id,
        label: item.label,
        category: item.category,
        checked: item.checked
      })),
      notes,
      allItemsPassed: allChecked
    };

    try {
      await fetch('/api/fleet/vehicle-inspections', {
        method: 'POST',
        body: JSON.stringify(inspectionData),
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Store working time start in localStorage for the 5-hour timer
      localStorage.setItem('workingTimeStart', completedAt.toISOString());
      localStorage.setItem('workingTimeVehicle', vehicleRegistration);
      
      onComplete();
    } catch (error) {
      console.error('Failed to save inspection:', error);
      setIsCompleted(false);
      setIsSubmitting(false);
    }
  }, [allChecked, isSubmitting, vehicleId, operatorId, vehicleRegistration, operatorName, startTime, elapsedTime, checklistItems, notes, onComplete]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-slate-900 text-white">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-white hover:bg-slate-800"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              Pre-Trip Vehicle Inspection
            </h1>
            <p className="text-sm text-slate-300">Daily walkaround check</p>
          </div>
        </div>
        
        {/* Vehicle & Operator Info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 bg-slate-800 rounded px-2 py-1">
            <Truck className="w-4 h-4 text-blue-400" />
            <span className="font-mono font-bold">{vehicleRegistration}</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-800 rounded px-2 py-1">
            <User className="w-4 h-4 text-green-400" />
            <span className="truncate">{operatorName}</span>
          </div>
        </div>
      </div>

      {/* Timer and Progress Bar */}
      <div className="flex-shrink-0 p-3 bg-slate-100 dark:bg-slate-800 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{formatDateTime(startTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className={`w-4 h-4 ${isCompleted ? 'text-green-500' : 'text-orange-500'}`} />
              <span className={`text-sm font-mono font-bold ${isCompleted ? 'text-green-600' : 'text-orange-600'}`}>
                {formatTime(elapsedTime)}
              </span>
            </div>
          </div>
          <Badge variant={allChecked ? "default" : "secondary"} className={allChecked ? "bg-green-500" : ""}>
            {totalChecked}/{totalItems} Checks
          </Badge>
        </div>
        
        {/* Progress bar */}
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${(totalChecked / totalItems) * 100}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {Object.entries(INSPECTION_CATEGORIES).map(([categoryKey, categoryLabel]) => {
            const progress = getCategoryProgress(categoryKey);
            const isExpanded = expandedCategories.has(categoryKey);
            const items = getItemsByCategory(categoryKey);
            const categoryComplete = progress.checked === progress.total;
            
            return (
              <Card key={categoryKey} className={categoryComplete ? "border-green-500" : ""}>
                <CardHeader 
                  className="py-3 px-4 cursor-pointer"
                  onClick={() => toggleCategory(categoryKey)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {categoryComplete && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {categoryLabel}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={categoryComplete ? "border-green-500 text-green-600" : ""}>
                        {progress.checked}/{progress.total}
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="pt-0 pb-3 px-4">
                    <div className="space-y-2">
                      {items.map(item => (
                        <div 
                          key={item.id}
                          className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                            item.checked 
                              ? 'bg-green-50 dark:bg-green-900/20' 
                              : 'bg-slate-50 dark:bg-slate-800/50'
                          }`}
                          onClick={() => toggleItem(item.id)}
                        >
                          <Checkbox 
                            checked={item.checked}
                            disabled={isCompleted}
                            className="mt-0.5"
                          />
                          <span className={`text-sm flex-1 ${item.checked ? 'text-green-700 dark:text-green-400' : ''}`}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Additional Notes */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium">Additional Notes</CardTitle>
              <CardDescription className="text-xs">
                Record any defects or observations
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-3 px-4">
              <Textarea
                placeholder="Enter any defects, damage, or notes here..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isCompleted}
                className="min-h-[80px]"
              />
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Complete Button */}
      <div className="flex-shrink-0 p-4 border-t bg-background">
        {!isCompleted ? (
          <Button
            className="w-full h-14 text-lg font-bold"
            disabled={!allChecked || isSubmitting}
            onClick={handleComplete}
          >
            {isSubmitting ? (
              <>
                <Clock className="w-5 h-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : allChecked ? (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Complete Inspection
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 mr-2" />
                Complete All Checks ({totalItems - totalChecked} remaining)
              </>
            )}
          </Button>
        ) : (
          <div className="text-center py-3">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-bold">Inspection Complete</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Duration: {formatTime(elapsedTime)} | Saved to Fleet Management
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
