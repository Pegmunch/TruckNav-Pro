import { useState, useCallback, useRef, useEffect } from "react";
import { useTheme } from "./theme-provider";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RotateCcw, Palette, Eye, EyeOff, Pipette } from "lucide-react";
import { cn } from "@/lib/utils";

interface HSLColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

interface ColorSpectrumPickerProps {
  className?: string;
  showPresets?: boolean;
  size?: "default" | "sm" | "lg";
}

// Color utility functions
const hslToHex = (h: number, s: number, l: number): string => {
  const hDecimal = l / 100;
  const a = (s * Math.min(hDecimal, 1 - hDecimal)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = hDecimal - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const hexToHsl = (hex: string): HSLColor => {
  // Input validation - ensure hex is valid format
  if (!hex || typeof hex !== 'string') {
    throw new Error('Invalid hex input: must be a string');
  }
  
  // Remove # if present and validate format
  const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
  
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    throw new Error(`Invalid hex format: ${hex}. Expected format: #RRGGBB`);
  }
  
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  // Validate parsed values
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    throw new Error(`Failed to parse RGB values from hex: ${hex}`);
  }

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const result = {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
  
  // Validate result ranges
  if (result.h < 0 || result.h > 360 || result.s < 0 || result.s > 100 || result.l < 0 || result.l > 100) {
    throw new Error(`Invalid HSL result: h=${result.h}, s=${result.s}, l=${result.l}`);
  }
  
  return result;
};

// Check if color meets WCAG contrast requirements
const getLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

const getContrastRatio = (hex1: string, hex2: string): number => {
  const rgb1 = [
    parseInt(hex1.slice(1, 3), 16),
    parseInt(hex1.slice(3, 5), 16),
    parseInt(hex1.slice(5, 7), 16)
  ];
  const rgb2 = [
    parseInt(hex2.slice(1, 3), 16),
    parseInt(hex2.slice(3, 5), 16),
    parseInt(hex2.slice(5, 7), 16)
  ];
  
  const lum1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

// Predefined color presets optimized for automotive UI
const colorPresets: HSLColor[] = [
  { h: 214, s: 100, l: 45 }, // Primary Blue
  { h: 45, s: 100, l: 55 },  // Warning Amber
  { h: 120, s: 65, l: 40 },  // Safety Green
  { h: 0, s: 85, l: 45 },    // Alert Red
  { h: 190, s: 80, l: 50 },  // Info Cyan
  { h: 280, s: 90, l: 60 },  // Purple
  { h: 35, s: 100, l: 50 },  // Orange
  { h: 300, s: 70, l: 50 },  // Magenta
];

export function ColorSpectrumPicker({
  className,
  showPresets = true,
  size = "default"
}: ColorSpectrumPickerProps) {
  const { customHSLColor, setCustomHSLColor, effectiveTheme } = useTheme();
  
  // Local state for immediate UI feedback
  const [localColor, setLocalColor] = useState<HSLColor>(customHSLColor || { h: 214, s: 100, l: 45 });
  const [hexInput, setHexInput] = useState<string>(hslToHex(localColor.h, localColor.s, localColor.l));
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [isColorWheelActive, setIsColorWheelActive] = useState<boolean>(false);
  
  const colorWheelRef = useRef<HTMLCanvasElement>(null);
  const debounceTimer = useRef<number | null>(null);
  
  // Debounced update function
  const debouncedSetColor = useCallback((color: HSLColor) => {
    if (debounceTimer.current) {
      cancelAnimationFrame(debounceTimer.current);
    }
    
    debounceTimer.current = requestAnimationFrame(() => {
      setCustomHSLColor(color);
    });
  }, [setCustomHSLColor]);
  
  // Update local color when theme changes externally
  useEffect(() => {
    if (customHSLColor) {
      setLocalColor(customHSLColor);
      setHexInput(hslToHex(customHSLColor.h, customHSLColor.s, customHSLColor.l));
    }
  }, [customHSLColor]);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        cancelAnimationFrame(debounceTimer.current);
      }
    };
  }, []);
  
  // Draw color wheel on canvas
  useEffect(() => {
    const canvas = colorWheelRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw color wheel
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = angle * Math.PI / 180;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.lineWidth = 20;
      ctx.strokeStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.stroke();
    }
    
    // Draw current hue indicator
    const currentAngle = (localColor.h - 90) * Math.PI / 180;
    const indicatorX = centerX + Math.cos(currentAngle) * radius;
    const indicatorY = centerY + Math.sin(currentAngle) * radius;
    
    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, 8, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.stroke();
    
  }, [localColor.h]);
  
  // Handle color wheel click
  const handleColorWheelClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = colorWheelRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const x = event.clientX - rect.left - centerX;
    const y = event.clientY - rect.top - centerY;
    
    const angle = (Math.atan2(y, x) * 180 / Math.PI + 90 + 360) % 360;
    const distance = Math.sqrt(x * x + y * y);
    const radius = Math.min(centerX, centerY) - 10;
    
    // Only update if click is on the wheel
    if (distance >= radius - 20 && distance <= radius + 10) {
      const newColor = { ...localColor, h: Math.round(angle) };
      setLocalColor(newColor);
      setHexInput(hslToHex(newColor.h, newColor.s, newColor.l));
      debouncedSetColor(newColor);
    }
  }, [localColor, debouncedSetColor]);
  
  // Handle saturation change
  const handleSaturationChange = useCallback((values: number[]) => {
    const newColor = { ...localColor, s: values[0] };
    setLocalColor(newColor);
    setHexInput(hslToHex(newColor.h, newColor.s, newColor.l));
    debouncedSetColor(newColor);
  }, [localColor, debouncedSetColor]);
  
  // Handle lightness change
  const handleLightnessChange = useCallback((values: number[]) => {
    const newColor = { ...localColor, l: values[0] };
    setLocalColor(newColor);
    setHexInput(hslToHex(newColor.h, newColor.s, newColor.l));
    debouncedSetColor(newColor);
  }, [localColor, debouncedSetColor]);
  
  // Handle hex input change
  const handleHexInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setHexInput(value);
    
    // Validate hex format and convert safely
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      try {
        const hslColor = hexToHsl(value);
        setLocalColor(hslColor);
        debouncedSetColor(hslColor);
      } catch (error) {
        console.warn('Failed to convert hex to HSL:', error);
        // Don't update the color if conversion fails
      }
    }
  }, [debouncedSetColor]);
  
  // Handle preset selection
  const handlePresetSelect = useCallback((preset: HSLColor) => {
    setLocalColor(preset);
    setHexInput(hslToHex(preset.h, preset.s, preset.l));
    debouncedSetColor(preset);
  }, [debouncedSetColor]);
  
  // Handle reset
  const handleReset = useCallback(() => {
    setCustomHSLColor(null);
    setLocalColor({ h: 214, s: 100, l: 45 });
    setHexInput(hslToHex(214, 100, 45));
  }, [setCustomHSLColor]);
  
  // Generate current color values
  const currentHex = hslToHex(localColor.h, localColor.s, localColor.l);
  const isCustomized = customHSLColor !== null;
  
  // Calculate contrast ratios for accessibility
  const backgroundHex = effectiveTheme === "night" ? "#0a0e1a" : "#fafbfc";
  const contrastRatio = getContrastRatio(currentHex, backgroundHex);
  const meetsWCAG = contrastRatio >= 4.5;
  
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Color Spectrum Picker
        </Label>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="h-8 w-8 p-0"
            data-testid="toggle-preview"
          >
            {showPreview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          {isCustomized && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 w-8 p-0"
              data-testid="reset-color"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Color Wheel */}
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3">
          <canvas
            ref={colorWheelRef}
            width={200}
            height={200}
            onClick={handleColorWheelClick}
            onMouseDown={() => setIsColorWheelActive(true)}
            onMouseUp={() => setIsColorWheelActive(false)}
            onMouseLeave={() => setIsColorWheelActive(false)}
            className={cn(
              "cursor-crosshair rounded-full transition-transform duration-200",
              "hover:scale-105 active:scale-95",
              "automotive-touch-target",
              size === "lg" && "w-56 h-56",
              size === "sm" && "w-40 h-40"
            )}
            data-testid="color-wheel"
            style={{ touchAction: "manipulation" }}
          />
          
          {/* Hue indicator */}
          <div className="text-xs text-muted-foreground">
            Hue: {Math.round(localColor.h)}°
          </div>
        </div>
      </div>
      
      {/* Saturation Control */}
      <div className="space-y-2">
        <Label htmlFor="saturation-slider" className="text-sm font-medium">
          Saturation: {Math.round(localColor.s)}%
        </Label>
        <div className="relative">
          <div 
            className="absolute inset-0 h-2 rounded-full -z-10"
            style={{
              background: `linear-gradient(to right, 
                hsl(${localColor.h}, 0%, ${localColor.l}%), 
                hsl(${localColor.h}, 100%, ${localColor.l}%))`,
              top: "50%",
              transform: "translateY(-50%)"
            }}
          />
          <Slider
            id="saturation-slider"
            value={[localColor.s]}
            onValueChange={handleSaturationChange}
            max={100}
            min={0}
            step={1}
            className="relative z-10"
            data-testid="saturation-slider"
          />
        </div>
      </div>
      
      {/* Lightness Control */}
      <div className="space-y-2">
        <Label htmlFor="lightness-slider" className="text-sm font-medium">
          Lightness: {Math.round(localColor.l)}%
        </Label>
        <div className="relative">
          <div 
            className="absolute inset-0 h-2 rounded-full -z-10"
            style={{
              background: `linear-gradient(to right, 
                hsl(${localColor.h}, ${localColor.s}%, 0%), 
                hsl(${localColor.h}, ${localColor.s}%, 50%), 
                hsl(${localColor.h}, ${localColor.s}%, 100%))`,
              top: "50%",
              transform: "translateY(-50%)"
            }}
          />
          <Slider
            id="lightness-slider"
            value={[localColor.l]}
            onValueChange={handleLightnessChange}
            max={100}
            min={0}
            step={1}
            className="relative z-10"
            data-testid="lightness-slider"
          />
        </div>
      </div>
      
      {/* Color Preview and Hex Input */}
      {showPreview && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg border-2 border-border shadow-sm flex-shrink-0"
              style={{ backgroundColor: currentHex }}
              data-testid="color-preview"
            />
            <div className="flex-1 space-y-1">
              <Label htmlFor="hex-input" className="text-sm font-medium">
                Hex Color
              </Label>
              <Input
                id="hex-input"
                value={hexInput}
                onChange={handleHexInputChange}
                placeholder="#3B82F6"
                className="font-mono text-sm automotive-input"
                data-testid="hex-input"
              />
            </div>
          </div>
          
          {/* Accessibility Information */}
          <div className="flex items-center gap-2 text-xs">
            <Badge 
              variant={meetsWCAG ? "default" : "destructive"}
              className="text-xs"
            >
              {meetsWCAG ? "✓ WCAG AA" : "⚠ Low Contrast"}
            </Badge>
            <span className="text-muted-foreground">
              Contrast: {contrastRatio.toFixed(1)}:1
            </span>
          </div>
        </div>
      )}
      
      {/* Color Presets */}
      {showPresets && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-sm font-medium">Quick Presets</Label>
            <div className="grid grid-cols-4 gap-2">
              {colorPresets.map((preset, index) => {
                const presetHex = hslToHex(preset.h, preset.s, preset.l);
                const isSelected = localColor.h === preset.h && 
                                 localColor.s === preset.s && 
                                 localColor.l === preset.l;
                
                return (
                  <button
                    key={index}
                    onClick={() => handlePresetSelect(preset)}
                    className={cn(
                      "w-full h-12 rounded-lg border-2 transition-all duration-200",
                      "automotive-touch-target hover:scale-105 active:scale-95",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                    )}
                    style={{ backgroundColor: presetHex }}
                    data-testid={`color-preset-${index}`}
                    aria-label={`Select color preset: hue ${preset.h}, saturation ${preset.s}%, lightness ${preset.l}%`}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}
      
      {/* Current Status */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground" data-testid="color-status">
          {isCustomized ? (
            <>
              Custom color: <span className="font-mono">{currentHex}</span>
            </>
          ) : (
            "Using default theme colors"
          )}
        </p>
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function CompactColorSpectrumPicker({ 
  className, 
  ...props 
}: Omit<ColorSpectrumPickerProps, "showPresets">) {
  return (
    <ColorSpectrumPicker 
      {...props}
      showPresets={false}
      size="sm"
      className={cn("w-fit", className)}
    />
  );
}