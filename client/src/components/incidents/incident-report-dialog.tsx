import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { INCIDENT_ICON_LIBRARY, INCIDENT_CATEGORIES, INCIDENT_TYPES, type IncidentTypeKey } from '@shared/incident-icons';
import { MapPin, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface IncidentReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLocation?: { lat: number; lng: number };
}

export function IncidentReportDialog({ 
  open, 
  onOpenChange, 
  currentLocation
}: IncidentReportDialogProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<IncidentTypeKey | null>(null);
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [description, setDescription] = useState('');

  const reportIncidentMutation = useMutation({
    mutationFn: async (incidentData: {
      type: string;
      title: string;
      description?: string;
      severity: 'low' | 'medium' | 'high';
      coordinates: { lat: number; lng: number };
    }) => {
      const response = await apiRequest('POST', '/api/traffic-incidents', incidentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Incident Reported",
        description: "Thank you for helping keep other drivers safe!",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/traffic-incidents'] });
      
      setSelectedCategory(null);
      setSelectedType(null);
      setSeverity('medium');
      setDescription('');
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Failed to report incident:', error);
      toast({
        title: "Failed to Report Incident",
        description: "Unable to submit your report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedType || !currentLocation) return;

    const config = INCIDENT_ICON_LIBRARY[selectedType];
    reportIncidentMutation.mutate({
      type: selectedType,
      title: config.label,
      description: description || config.description,
      severity,
      coordinates: currentLocation,
    });
  };

  const filteredIncidents = selectedCategory
    ? Object.entries(INCIDENT_ICON_LIBRARY)
        .filter(([_, config]) => config.category === selectedCategory)
        .map(([type, config]) => ({ type: type as IncidentTypeKey, ...config }))
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Report Road Incident
          </DialogTitle>
          <DialogDescription>
            Help other truck drivers by reporting road incidents and hazards
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Step 1: Select Category */}
            {!selectedCategory && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Select Incident Category</h3>
                <div className="grid grid-cols-2 gap-3">
                  {INCIDENT_CATEGORIES.map((category) => (
                    <Button
                      key={category.id}
                      variant="outline"
                      className="h-auto py-4 px-4 justify-start"
                      onClick={() => setSelectedCategory(category.id)}
                      data-testid={`category-${category.id}`}
                    >
                      <div className="text-left">
                        <div className={cn("font-semibold", category.color)}>
                          {category.label}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Select Incident Type */}
            {selectedCategory && !selectedType && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Select Incident Type</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    data-testid="button-back-category"
                  >
                    ← Back
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {filteredIncidents.map((incident) => (
                    <Button
                      key={incident.type}
                      variant="outline"
                      className="h-auto py-4 px-4 justify-start"
                      onClick={() => setSelectedType(incident.type)}
                      data-testid={`incident-${incident.type}`}
                    >
                      <div className="flex items-center gap-3 text-left">
                        <div 
                          className="text-2xl w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: incident.bgColor }}
                        >
                          {incident.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{incident.label}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {incident.description}
                          </div>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Add Details */}
            {selectedType && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Incident Details</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedType(null)}
                    data-testid="button-back-type"
                  >
                    ← Back
                  </Button>
                </div>

                {/* Selected Incident Preview */}
                <div 
                  className="p-4 rounded-lg border-2 flex items-center gap-3"
                  style={{ 
                    backgroundColor: INCIDENT_ICON_LIBRARY[selectedType].bgColor,
                    borderColor: INCIDENT_ICON_LIBRARY[selectedType].color 
                  }}
                >
                  <div className="text-3xl">
                    {INCIDENT_ICON_LIBRARY[selectedType].emoji}
                  </div>
                  <div>
                    <div className="font-semibold">
                      {INCIDENT_ICON_LIBRARY[selectedType].label}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {INCIDENT_ICON_LIBRARY[selectedType].description}
                    </div>
                  </div>
                </div>

                {/* Severity Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Severity</label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <Button
                        key={level}
                        variant={severity === level ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSeverity(level)}
                        className="flex-1"
                        data-testid={`severity-${level}`}
                      >
                        <Badge
                          variant={
                            level === 'high' 
                              ? 'destructive' 
                              : level === 'medium' 
                              ? 'default' 
                              : 'secondary'
                          }
                          className="mr-2"
                        >
                          {level.toUpperCase()}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Additional Details (Optional)
                  </label>
                  <Textarea
                    placeholder="Add any additional information about this incident..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    data-testid="input-description"
                  />
                </div>

                {/* Location Info */}
                {currentLocation && (
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>
                        Location: {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  className="w-full"
                  size="lg"
                  disabled={!currentLocation || reportIncidentMutation.isPending}
                  data-testid="button-submit-report"
                >
                  {reportIncidentMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Report
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
