import { useState, useCallback, useEffect, useRef } from "react";
import { useTheme } from "./theme-provider";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RotateCcw, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

interface GrayscaleSelectorProps {
  className?: string;
  showLabel?: boolean;
  showPreview?: boolean;
  showReset?: boolean;
  size?: "default" | "sm" | "lg";
}

export function GrayscaleSelector({
  className,
  showLabel = true,
  showPreview = true,
  showReset = true,
  size = "default"
}: GrayscaleSelectorProps) {
  const { grayL, setGrayL } = useTheme();
  
  // Local state for immediate UI feedback
  const [localValue, setLocalValue] = useState<number>(grayL ?? 50);
  const debounceTimer = useRef<number | null>(null);
  
  // Debounced update function using requestAnimationFrame for smooth performance
  const debouncedSetGrayL = useCallback((value: number) => {
    if (debounceTimer.current) {
      cancelAnimationFrame(debounceTimer.current);
    }
    
    debounceTimer.current = requestAnimationFrame(() => {
      setGrayL(value);
    });
  }, [setGrayL]);
  
  // Update local value when theme changes externally
  useEffect(() => {
    setLocalValue(grayL ?? 50);
  }, [grayL]);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        cancelAnimationFrame(debounceTimer.current);
      }
    };
  }, []);
  
  const handleSliderChange = useCallback((values: number[]) => {
    const newValue = values[0];
    setLocalValue(newValue);
    debouncedSetGrayL(newValue);
  }, [debouncedSetGrayL]);
  
  const handleReset = useCallback(() => {
    setLocalValue(50);
    setGrayL(null); // null resets to default theme colors
  }, [setGrayL]);
  
  const isCustomized = grayL !== null;
  
  // Generate preview color based on current value
  const previewColor = `hsl(0, 0%, ${localValue}%)`;
  
  // Generate contrast-safe text color for preview
  const getPreviewTextColor = (lightness: number): string => {
    return lightness > 50 ? "hsl(0, 0%, 0%)" : "hsl(0, 0%, 100%)";
  };
  
  const previewTextColor = getPreviewTextColor(localValue);
  
  return (
    <div className={cn("space-y-4", className)}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <Label 
            htmlFor="grayscale-slider" 
            className="text-sm font-medium flex items-center gap-2"
          >
            <Palette className="w-4 h-4" />
            Grayscale Override
          </Label>
          <span 
            className="text-xs text-muted-foreground font-mono"
            data-testid="grayscale-value-display"
          >
            {isCustomized ? `${Math.round(localValue)}%` : "Default"}
          </span>
        </div>
      )}
      
      <div className="space-y-3">
        {/* Slider with gradient background */}
        <div className="relative">
          <div 
            className="absolute inset-0 h-2 rounded-full -z-10"
            style={{
              background: "linear-gradient(to right, hsl(0, 0%, 100%), hsl(0, 0%, 0%))",
              top: "50%",
              transform: "translateY(-50%)"
            }}
          />
          <Slider
            id="grayscale-slider"
            value={[localValue]}
            onValueChange={handleSliderChange}
            max={100}
            min={0}
            step={1}
            className={cn(
              "relative z-10",
              size === "sm" && "h-4",
              size === "lg" && "h-6"
            )}
            aria-label={`Grayscale override: ${Math.round(localValue)}%`}
            data-testid="grayscale-slider"
          />
        </div>
        
        {/* Preview swatch and controls */}
        <div className="flex items-center gap-3">
          {showPreview && (
            <div 
              className={cn(
                "flex items-center justify-center rounded-md border border-border transition-all duration-200",
                size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-12 h-12 text-sm" : "w-10 h-10 text-xs"
              )}
              style={{
                backgroundColor: previewColor,
                color: previewTextColor
              }}
              data-testid="grayscale-preview-swatch"
              title={`Preview: ${Math.round(localValue)}% gray`}
            >
              <span className="font-mono font-bold select-none">
                {Math.round(localValue)}
              </span>
            </div>
          )}
          
          {showReset && (
            <Button
              variant="outline"
              size={size === "lg" ? "default" : "sm"}
              onClick={handleReset}
              disabled={!isCustomized}
              className={cn(
                "flex items-center gap-2 transition-all duration-200",
                isCustomized && "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
              )}
              data-testid="grayscale-reset-button"
              aria-label="Reset grayscale to default theme colors"
            >
              <RotateCcw className="w-3 h-3" />
              {size !== "sm" && "Reset"}
            </Button>
          )}
        </div>
        
        {/* Status indicator */}
        {isCustomized && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span data-testid="grayscale-status">
              Custom grayscale applied ({Math.round(localValue)}% gray)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function CompactGrayscaleSelector({ className, ...props }: Omit<GrayscaleSelectorProps, "size" | "showLabel">) {
  return (
    <GrayscaleSelector
      {...props}
      size="sm"
      showLabel={false}
      className={cn("space-y-2", className)}
    />
  );
}

// Minimal version with just slider and preview
export function MinimalGrayscaleSelector({ className }: { className?: string }) {
  const { grayL, setGrayL } = useTheme();
  const [localValue, setLocalValue] = useState<number>(grayL ?? 50);
  const debounceTimer = useRef<number | null>(null);
  
  const debouncedSetGrayL = useCallback((value: number) => {
    if (debounceTimer.current) {
      cancelAnimationFrame(debounceTimer.current);
    }
    
    debounceTimer.current = requestAnimationFrame(() => {
      setGrayL(value);
    });
  }, [setGrayL]);
  
  useEffect(() => {
    setLocalValue(grayL ?? 50);
  }, [grayL]);
  
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        cancelAnimationFrame(debounceTimer.current);
      }
    };
  }, []);
  
  const handleSliderChange = useCallback((values: number[]) => {
    const newValue = values[0];
    setLocalValue(newValue);
    debouncedSetGrayL(newValue);
  }, [debouncedSetGrayL]);
  
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div 
        className="w-6 h-6 rounded border border-border flex items-center justify-center"
        style={{ backgroundColor: `hsl(0, 0%, ${localValue}%)` }}
        data-testid="minimal-grayscale-preview"
      >
        <span 
          className="text-[8px] font-mono font-bold select-none"
          style={{ color: localValue > 50 ? "black" : "white" }}
        >
          {Math.round(localValue)}
        </span>
      </div>
      <div className="relative flex-1">
        <div 
          className="absolute inset-0 h-1 rounded-full -z-10"
          style={{
            background: "linear-gradient(to right, hsl(0, 0%, 100%), hsl(0, 0%, 0%))",
            top: "50%",
            transform: "translateY(-50%)"
          }}
        />
        <Slider
          value={[localValue]}
          onValueChange={handleSliderChange}
          max={100}
          min={0}
          step={1}
          className="relative z-10 h-4"
          data-testid="minimal-grayscale-slider"
        />
      </div>
    </div>
  );
}