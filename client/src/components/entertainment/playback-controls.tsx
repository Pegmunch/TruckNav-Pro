/**
 * Playback Controls - Audio player controls for entertainment panel
 * 
 * Automotive-optimized playback interface with large touch targets
 * Supports play/pause, volume control, and emergency interrupt
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Volume1,
  AlertTriangle,
  Loader2,
  Radio,
  Music
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type PlaybackStatus } from "@/lib/entertainment/audio-manager";

interface PlaybackControlsProps {
  playbackStatus: PlaybackStatus;
  onPlayPause: () => void;
  onVolumeChange: (volume: number) => void;
  onEmergencyInterrupt: () => void;
  disabled?: boolean;
  className?: string;
}

export default function PlaybackControls({
  playbackStatus,
  onPlayPause,
  onVolumeChange,
  onEmergencyInterrupt,
  disabled = false,
  className
}: PlaybackControlsProps) {
  const [previousVolume, setPreviousVolume] = useState(0.8);

  // Handle mute/unmute
  const handleMuteToggle = useCallback(() => {
    if (playbackStatus.volume > 0) {
      setPreviousVolume(playbackStatus.volume);
      onVolumeChange(0);
    } else {
      onVolumeChange(previousVolume);
    }
  }, [playbackStatus.volume, previousVolume, onVolumeChange]);

  // Get volume icon based on current volume
  const getVolumeIcon = () => {
    if (playbackStatus.volume === 0) return VolumeX;
    if (playbackStatus.volume < 0.5) return Volume1;
    return Volume2;
  };

  const VolumeIcon = getVolumeIcon();

  return (
    <div className={cn("flex flex-col gap-4", className)} data-testid="playback-controls">
      {/* Main Controls Row */}
      <div className="flex items-center justify-between">
        {/* Play/Pause Button */}
        <Button
          variant="default"
          size="lg"
          onClick={onPlayPause}
          disabled={disabled}
          className="automotive-touch-target automotive-button flex-shrink-0"
          data-testid="button-play-pause"
        >
          {playbackStatus.buffering ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : playbackStatus.isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6" />
          )}
          <span className="ml-2 automotive-text-base">
            {playbackStatus.buffering ? 'Loading...' : 
             playbackStatus.isPlaying ? 'Pause' : 'Play'}
          </span>
        </Button>

        {/* Volume Controls */}
        <div className="flex items-center gap-3 flex-1 max-w-xs">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMuteToggle}
            disabled={disabled}
            className="automotive-touch-target flex-shrink-0"
            data-testid="button-mute"
          >
            <VolumeIcon className="h-5 w-5" />
          </Button>

          <div className="flex-1">
            <Slider
              value={[playbackStatus.volume]}
              onValueChange={(values) => onVolumeChange(values[0])}
              max={1}
              min={0}
              step={0.05}
              disabled={disabled}
              className="w-full"
              data-testid="slider-volume"
            />
          </div>

          <div className="automotive-text-sm text-muted-foreground min-w-[3rem]">
            {Math.round(playbackStatus.volume * 100)}%
          </div>
        </div>

        {/* Emergency Interrupt Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onEmergencyInterrupt}
          disabled={disabled || !playbackStatus.isPlaying}
          className="automotive-touch-target flex-shrink-0"
          data-testid="button-emergency-interrupt"
          title="Reduce volume for navigation alerts"
        >
          <AlertTriangle className="h-4 w-4 mr-1" />
          <span className="automotive-text-sm">Alert</span>
        </Button>
      </div>

      {/* Progress Bar (for non-live content) */}
      {playbackStatus.duration > 0 && (
        <div className="space-y-2">
          <Slider
            value={[playbackStatus.currentTime]}
            max={playbackStatus.duration}
            min={0}
            step={1}
            disabled={true} // Read-only for now
            className="w-full"
            data-testid="slider-progress"
          />
          
          <div className="flex justify-between automotive-text-xs text-muted-foreground">
            <span>{formatTime(playbackStatus.currentTime)}</span>
            <span>{formatTime(playbackStatus.duration)}</span>
          </div>
        </div>
      )}

      {/* Status Information */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {playbackStatus.isPlaying && (
            <Badge variant="default" className="scalable-badge animate-pulse">
              <Radio className="h-3 w-3 mr-1" />
              Live
            </Badge>
          )}
          
          {playbackStatus.buffering && (
            <Badge variant="secondary" className="scalable-badge">
              Buffering...
            </Badge>
          )}
        </div>

        {playbackStatus.error && (
          <Badge variant="destructive" className="scalable-badge">
            Error
          </Badge>
        )}
      </div>
    </div>
  );
}

// Helper function to format time in MM:SS format
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}