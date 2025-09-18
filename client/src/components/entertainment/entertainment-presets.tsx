/**
 * Entertainment Presets - Favorites and quick access presets for entertainment content
 * 
 * Automotive-optimized preset management with numbered quick access
 * Supports both user favorites and system-defined presets
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Heart, 
  Plus,
  Edit3,
  Trash2,
  Radio,
  Music,
  Star,
  Clock,
  Loader2,
  Truck,
  Settings,
  Volume2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { type EntertainmentStation, type EntertainmentPreset } from "@shared/schema";

interface EntertainmentPresetsProps {
  onStationSelect: (station: EntertainmentStation) => void;
  currentStation?: EntertainmentStation | null;
  isLoading?: boolean;
  className?: string;
}

export default function EntertainmentPresets({
  onStationSelect,
  currentStation,
  isLoading = false,
  className
}: EntertainmentPresetsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Component state
  const [showAddPreset, setShowAddPreset] = useState(false);
  const [editingPreset, setEditingPreset] = useState<EntertainmentPreset | null>(null);
  const [presetName, setPresetName] = useState('');
  const [presetNumber, setPresetNumber] = useState<number | ''>('');

  // Presets query
  const { data: presets, isLoading: isLoadingPresets } = useQuery({
    queryKey: ['/api/entertainment/presets'],
    queryFn: async () => {
      const response = await fetch('/api/entertainment/presets');
      if (!response.ok) throw new Error('Failed to fetch presets');
      return response.json() as (EntertainmentPreset & { station: EntertainmentStation })[];
    },
  });

  // Add preset mutation
  const addPresetMutation = useMutation({
    mutationFn: async (presetData: { 
      stationId: string; 
      presetNumber?: number; 
      customName?: string; 
      volume?: number;
    }) => {
      const response = await fetch('/api/entertainment/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(presetData),
      });
      if (!response.ok) throw new Error('Failed to add preset');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/entertainment/presets'] });
      setShowAddPreset(false);
      setPresetName('');
      setPresetNumber('');
      toast({
        title: "Preset Added",
        description: "Station has been added to your presets.",
      });
    },
    onError: (error) => {
      console.error('Failed to add preset:', error);
      toast({
        title: "Error",
        description: "Failed to add preset. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update preset mutation
  const updatePresetMutation = useMutation({
    mutationFn: async ({ id, data }: { 
      id: number; 
      data: { customName?: string; presetNumber?: number; volume?: number } 
    }) => {
      const response = await fetch(`/api/entertainment/presets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update preset');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/entertainment/presets'] });
      setEditingPreset(null);
      setPresetName('');
      setPresetNumber('');
      toast({
        title: "Preset Updated",
        description: "Preset has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Failed to update preset:', error);
      toast({
        title: "Error",
        description: "Failed to update preset. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete preset mutation
  const deletePresetMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/entertainment/presets/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete preset');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/entertainment/presets'] });
      toast({
        title: "Preset Deleted",
        description: "Preset has been removed from your favorites.",
      });
    },
    onError: (error) => {
      console.error('Failed to delete preset:', error);
      toast({
        title: "Error",
        description: "Failed to delete preset. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle add current station as preset
  const handleAddCurrentStation = useCallback(() => {
    if (!currentStation) {
      toast({
        title: "No Station Selected",
        description: "Please select a station first to add as preset.",
        variant: "destructive",
      });
      return;
    }

    // Find next available preset number
    const usedNumbers = presets?.map(p => p.presetNumber).filter(Boolean) || [];
    const nextNumber = Array.from({ length: 10 }, (_, i) => i + 1)
      .find(num => !usedNumbers.includes(num)) || undefined;

    addPresetMutation.mutate({
      stationId: currentStation.id,
      presetNumber: nextNumber,
      customName: currentStation.name,
      volume: 0.8,
    });
  }, [currentStation, presets, addPresetMutation]);

  // Handle preset edit
  const handleEditPreset = useCallback((preset: EntertainmentPreset & { station: EntertainmentStation }) => {
    setEditingPreset(preset);
    setPresetName(preset.customName || preset.station.name);
    setPresetNumber(preset.presetNumber || '');
  }, []);

  // Handle save preset edit
  const handleSaveEdit = useCallback(() => {
    if (!editingPreset) return;

    updatePresetMutation.mutate({
      id: editingPreset.id,
      data: {
        customName: presetName || undefined,
        presetNumber: presetNumber === '' ? undefined : Number(presetNumber),
      },
    });
  }, [editingPreset, presetName, presetNumber, updatePresetMutation]);

  // Handle delete preset
  const handleDeletePreset = useCallback((presetId: number) => {
    deletePresetMutation.mutate(presetId);
  }, [deletePresetMutation]);

  // Format last used time
  const formatLastUsed = (date: string | null): string => {
    if (!date) return 'Never';
    const diffMs = Date.now() - new Date(date).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return 'Just now';
  };

  // Group presets by numbered vs unnumbered
  const numberedPresets = presets?.filter(p => p.presetNumber) || [];
  const otherPresets = presets?.filter(p => !p.presetNumber) || [];

  // Sort numbered presets by preset number
  numberedPresets.sort((a, b) => (a.presetNumber || 0) - (b.presetNumber || 0));

  // Render preset item
  const renderPreset = (preset: EntertainmentPreset & { station: EntertainmentStation }, showNumber = true) => (
    <Card 
      key={preset.id} 
      className="automotive-card cursor-pointer hover:bg-accent/5 transition-colors"
      data-testid={`preset-${preset.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Preset Number or Icon */}
          <div className="flex-shrink-0 automotive-touch-target">
            {showNumber && preset.presetNumber ? (
              <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
                {preset.presetNumber}
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                {preset.station.platform === 'tunein' ? (
                  <Radio className="h-5 w-5 text-primary" />
                ) : (
                  <Music className="h-5 w-5 text-primary" />
                )}
              </div>
            )}
          </div>

          {/* Preset Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="automotive-text-base font-medium truncate">
                {preset.customName || preset.station.name}
              </h4>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditPreset(preset);
                  }}
                  className="h-6 w-6 p-0"
                  data-testid={`edit-preset-${preset.id}`}
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePreset(preset.id);
                  }}
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  data-testid={`delete-preset-${preset.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <p className="automotive-text-sm text-muted-foreground truncate">
              {preset.station.creator || preset.station.genre}
            </p>

            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="scalable-badge">
                {preset.station.platform}
              </Badge>
              
              {preset.station.isTruckingRelated && (
                <Badge variant="outline" className="scalable-badge">
                  <Truck className="h-2 w-2 mr-1" />
                  Trucking
                </Badge>
              )}

              <div className="flex items-center gap-1 text-muted-foreground">
                <Volume2 className="h-3 w-3" />
                <span className="automotive-text-xs">
                  {Math.round((preset.volume || 0.8) * 100)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="automotive-text-xs text-muted-foreground">
                  {formatLastUsed(preset.lastUsedAt)}
                </span>
              </div>

              <span className="automotive-text-xs text-muted-foreground">
                {preset.useCount || 0} plays
              </span>
            </div>
          </div>
        </div>

        {/* Click handler for playing */}
        <div 
          className="absolute inset-0 cursor-pointer"
          onClick={() => onStationSelect(preset.station)}
        />
      </CardContent>
    </Card>
  );

  return (
    <div className={cn("space-y-4", className)} data-testid="entertainment-presets">
      {/* Header with Add Current Station Button */}
      <div className="flex items-center justify-between">
        <h3 className="automotive-text-lg font-medium">Presets & Favorites</h3>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddCurrentStation}
          disabled={!currentStation || addPresetMutation.isPending || isLoading}
          className="automotive-button automotive-text-sm"
          data-testid="add-current-station"
        >
          <Heart className="h-3 w-3 mr-1" />
          Add Current
        </Button>
      </div>

      {/* Quick Access Numbers (1-10) */}
      {numberedPresets.length > 0 && (
        <div className="space-y-2">
          <h4 className="automotive-text-base font-medium">Quick Access</h4>
          <div className="grid grid-cols-2 gap-3">
            {numberedPresets.map(preset => renderPreset(preset, true))}
          </div>
        </div>
      )}

      {numberedPresets.length > 0 && otherPresets.length > 0 && <Separator />}

      {/* Other Favorites */}
      {otherPresets.length > 0 && (
        <div className="space-y-2">
          <h4 className="automotive-text-base font-medium">Other Favorites</h4>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {otherPresets.map(preset => renderPreset(preset, false))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Empty State */}
      {(!presets || presets.length === 0) && !isLoadingPresets && (
        <div className="text-center py-8">
          <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="automotive-text-base text-muted-foreground">
            No presets yet
          </p>
          <p className="automotive-text-sm text-muted-foreground">
            Play a station and tap "Add Current" to create your first preset
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoadingPresets && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Edit Preset Dialog */}
      <Dialog open={!!editingPreset} onOpenChange={(open) => !open && setEditingPreset(null)}>
        <DialogContent className="automotive-card">
          <DialogHeader>
            <DialogTitle>Edit Preset</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Enter preset name"
                className="automotive-input"
              />
            </div>

            <div>
              <Label htmlFor="preset-number">Quick Access Number (1-10)</Label>
              <Input
                id="preset-number"
                type="number"
                min="1"
                max="10"
                value={presetNumber}
                onChange={(e) => setPresetNumber(e.target.value === '' ? '' : parseInt(e.target.value))}
                placeholder="Optional quick access number"
                className="automotive-input"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setEditingPreset(null)}
                disabled={updatePresetMutation.isPending}
              >
                Cancel
              </Button>
              
              <Button 
                onClick={handleSaveEdit}
                disabled={updatePresetMutation.isPending}
              >
                {updatePresetMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}