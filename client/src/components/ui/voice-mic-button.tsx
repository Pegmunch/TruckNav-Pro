"use client"

import * as React from "react"
import { Mic, MicOff, Loader2, CheckCircle, XCircle } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "./tooltip"

// Voice recording states
export type VoiceState = 
  | "idle"          // Not recording, ready to start
  | "listening"     // Currently recording/listening
  | "processing"    // Processing the voice input
  | "success"       // Successfully processed
  | "error"         // Error occurred

// Interaction modes
export type InteractionMode = "press-hold" | "toggle"

// Component variants using cva
const voiceMicButtonVariants = cva(
  "relative inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none touch-manipulation",
  {
    variants: {
      state: {
        idle: "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95",
        listening: "bg-destructive text-destructive-foreground animate-pulse shadow-lg shadow-destructive/50",
        processing: "bg-secondary text-secondary-foreground cursor-wait",
        success: "bg-green-500 text-white",
        error: "bg-red-500 text-white"
      },
      size: {
        sm: "h-10 w-10 min-h-[44px] min-w-[44px]", // Automotive minimum touch target
        md: "h-12 w-12 min-h-[48px] min-w-[48px]",
        lg: "h-16 w-16 min-h-[56px] min-w-[56px]",
        xl: "h-20 w-20 min-h-[64px] min-w-[64px]"
      }
    },
    defaultVariants: {
      state: "idle",
      size: "md"
    }
  }
)

// Animated rings for visual feedback
const AnimatedRings: React.FC<{ isActive: boolean; state: VoiceState }> = ({ isActive, state }) => {
  if (!isActive || state !== "listening") return null;
  
  return (
    <>
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-2 border-destructive animate-ping opacity-75" />
      {/* Middle ring */}
      <div className="absolute inset-1 rounded-full border-2 border-destructive/60 animate-ping opacity-60" style={{ animationDelay: "0.2s" }} />
      {/* Inner ring */}
      <div className="absolute inset-2 rounded-full border-2 border-destructive/40 animate-ping opacity-40" style={{ animationDelay: "0.4s" }} />
    </>
  )
}

// Transcript overlay component
const TranscriptOverlay: React.FC<{
  transcript: string;
  isVisible: boolean;
  position?: "top" | "bottom" | "left" | "right";
}> = ({ transcript, isVisible, position = "top" }) => {
  if (!isVisible || !transcript.trim()) return null;
  
  const positionClasses = {
    top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
    left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
    right: "left-full top-1/2 transform -translate-y-1/2 ml-2"
  };

  return (
    <div
      className={cn(
        "absolute z-50 max-w-xs px-3 py-2 text-sm text-popover-foreground bg-popover border border-border rounded-md shadow-lg animate-in fade-in-0 zoom-in-95",
        positionClasses[position]
      )}
      data-testid="voice-transcript-overlay"
    >
      <div className="flex items-start gap-2">
        <Mic className="h-4 w-4 mt-0.5 text-primary" />
        <p className="text-left leading-relaxed">{transcript}</p>
      </div>
      {/* Arrow pointer */}
      <div 
        className={cn(
          "absolute w-0 h-0 border-4 border-transparent",
          {
            "top-full left-1/2 transform -translate-x-1/2 border-t-border border-b-0": position === "top",
            "bottom-full left-1/2 transform -translate-x-1/2 border-b-border border-t-0": position === "bottom",
            "top-1/2 left-full transform -translate-y-1/2 border-l-border border-r-0": position === "left",
            "top-1/2 right-full transform -translate-y-1/2 border-r-border border-l-0": position === "right"
          }
        )}
      />
    </div>
  )
}

// State icon component
const StateIcon: React.FC<{ state: VoiceState; size: "sm" | "md" | "lg" | "xl" | null | undefined }> = ({ state, size }) => {
  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5", 
    lg: "h-6 w-6",
    xl: "h-8 w-8"
  };

  const iconSize = iconSizes[size || "md"];

  switch (state) {
    case "listening":
      return <Mic className={cn(iconSize, "animate-pulse")} data-testid="mic-listening-icon" />;
    case "processing":
      return <Loader2 className={cn(iconSize, "animate-spin")} data-testid="mic-processing-icon" />;
    case "success":
      return <CheckCircle className={iconSize} data-testid="mic-success-icon" />;
    case "error":
      return <XCircle className={iconSize} data-testid="mic-error-icon" />;
    case "idle":
    default:
      return <Mic className={iconSize} data-testid="mic-idle-icon" />;
  }
}

export interface VoiceMicButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onMouseDown" | "onMouseUp" | "onTouchStart" | "onTouchEnd">,
    VariantProps<typeof voiceMicButtonVariants> {
  /** Current voice recording state */
  state?: VoiceState;
  /** Interaction mode - press-hold or toggle */
  mode?: InteractionMode;
  /** Current transcript text to display */
  transcript?: string;
  /** Position of transcript overlay */
  transcriptPosition?: "top" | "bottom" | "left" | "right";
  /** Show transcript overlay */
  showTranscript?: boolean;
  /** Callback when recording starts */
  onRecordingStart?: () => void;
  /** Callback when recording stops */
  onRecordingStop?: () => void;
  /** Callback for toggle mode state changes */
  onToggle?: (isRecording: boolean) => void;
  /** Custom tooltip text */
  tooltipText?: string;
  /** Disable animations (for reduced motion preferences) */
  disableAnimations?: boolean;
}

export const VoiceMicButton = React.forwardRef<HTMLButtonElement, VoiceMicButtonProps>(
  ({
    className,
    state = "idle",
    size = "md",
    mode = "press-hold",
    transcript = "",
    transcriptPosition = "top",
    showTranscript = false,
    onRecordingStart,
    onRecordingStop,
    onToggle,
    tooltipText,
    disableAnimations = false,
    disabled,
    ...props
  }, ref) => {
    const [isPressed, setIsPressed] = React.useState(false);
    const [isToggled, setIsToggled] = React.useState(false);
    const [touchStartTime, setTouchStartTime] = React.useState<number>(0);
    const pressTimerRef = React.useRef<NodeJS.Timeout>();
    const longPressThreshold = 500; // 500ms for long press detection

    // Determine if currently recording
    const isRecording = mode === "toggle" ? isToggled : isPressed;
    const currentState = isRecording ? "listening" : state;

    // Handle mouse/touch events for press-and-hold mode
    const handlePressStart = React.useCallback((event: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      
      event.preventDefault();
      const currentTime = Date.now();
      setTouchStartTime(currentTime);
      
      if (mode === "press-hold") {
        setIsPressed(true);
        onRecordingStart?.();
      } else {
        // Toggle mode - set up long press detection
        pressTimerRef.current = setTimeout(() => {
          // Long press detected in toggle mode
          setIsToggled(!isToggled);
          onToggle?.(!isToggled);
        }, longPressThreshold);
      }
    }, [disabled, mode, onRecordingStart, onToggle, isToggled]);

    const handlePressEnd = React.useCallback((event: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      
      event.preventDefault();
      const pressDuration = Date.now() - touchStartTime;
      
      if (mode === "press-hold") {
        setIsPressed(false);
        onRecordingStop?.();
      } else {
        // Clear long press timer
        if (pressTimerRef.current) {
          clearTimeout(pressTimerRef.current);
        }
        
        // If it was a short press (not long press), toggle
        if (pressDuration < longPressThreshold) {
          setIsToggled(!isToggled);
          onToggle?.(!isToggled);
        }
      }
    }, [disabled, mode, touchStartTime, onRecordingStop, onToggle, isToggled]);

    // Handle keyboard interactions
    const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
      if (disabled) return;
      
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        if (mode === "press-hold") {
          if (!isPressed) {
            setIsPressed(true);
            onRecordingStart?.();
          }
        } else {
          setIsToggled(!isToggled);
          onToggle?.(!isToggled);
        }
      }
    }, [disabled, mode, isPressed, onRecordingStart, onToggle, isToggled]);

    const handleKeyUp = React.useCallback((event: React.KeyboardEvent) => {
      if (disabled) return;
      
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        if (mode === "press-hold" && isPressed) {
          setIsPressed(false);
          onRecordingStop?.();
        }
      }
    }, [disabled, mode, isPressed, onRecordingStop]);

    // Cleanup on unmount
    React.useEffect(() => {
      return () => {
        if (pressTimerRef.current) {
          clearTimeout(pressTimerRef.current);
        }
      };
    }, []);

    // Generate ARIA labels based on state and mode
    const getAriaLabel = () => {
      if (tooltipText) return tooltipText;
      
      const baseLabel = mode === "toggle" ? "Toggle voice recording" : "Hold to record voice";
      const stateLabels = {
        idle: baseLabel,
        listening: "Recording voice input",
        processing: "Processing voice input",
        success: "Voice input successful",
        error: "Voice input error"
      };
      return stateLabels[currentState] || baseLabel;
    };

    const button = (
      <button
        ref={ref}
        className={cn(voiceMicButtonVariants({ state: currentState, size }), className)}
        disabled={disabled}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        aria-label={getAriaLabel()}
        aria-pressed={mode === "toggle" ? isToggled : undefined}
        data-testid={`voice-mic-button-${currentState}`}
        data-recording={isRecording}
        data-mode={mode}
        {...props}
      >
        {/* Animated rings for listening state */}
        {!disableAnimations && (
          <AnimatedRings isActive={isRecording} state={currentState} />
        )}
        
        {/* Main icon */}
        <StateIcon state={currentState} size={size} />
        
        {/* Transcript overlay */}
        <TranscriptOverlay 
          transcript={transcript}
          isVisible={showTranscript && isRecording}
          position={transcriptPosition}
        />
      </button>
    );

    // Wrap with tooltip if needed
    if (tooltipText || (mode === "press-hold" && !isRecording)) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {button}
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltipText || (mode === "press-hold" ? "Hold to record" : "Tap to toggle recording")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return button;
  }
);

VoiceMicButton.displayName = "VoiceMicButton";

// Export variants for external use
export { voiceMicButtonVariants };