import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, X, Search, MapPin, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedInputProps extends React.ComponentProps<"input"> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  showOptional?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  loading?: boolean;
  success?: boolean;
  variant?: "default" | "search" | "location" | "destination";
}

/**
 * EnhancedInput Component
 * An enhanced input field with built-in label, validation, icons, and mobile optimization
 */
export const EnhancedInput = React.forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({ 
    label,
    description,
    error,
    required,
    showOptional,
    leftIcon,
    rightIcon,
    clearable,
    onClear,
    loading,
    success,
    variant = "default",
    className,
    value,
    onChange,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const id = React.useId();
    const isPassword = props.type === "password";
    const hasValue = value && value.toString().length > 0;

    // Auto-detect variant based on props
    const autoVariant = React.useMemo(() => {
      if (variant !== "default") return variant;
      if (props.placeholder?.toLowerCase().includes("search")) return "search";
      if (props.placeholder?.toLowerCase().includes("location") || 
          props.placeholder?.toLowerCase().includes("address")) return "location";
      return "default";
    }, [variant, props.placeholder]);

    const getVariantIcons = () => {
      switch (autoVariant) {
        case "search":
          return { left: <Search className="h-4 w-4 text-muted-foreground" /> };
        case "location":
          return { left: <MapPin className="h-4 w-4 text-muted-foreground" /> };
        case "destination":
          return { left: <Navigation className="h-4 w-4 text-muted-foreground" /> };
        default:
          return {};
      }
    };

    const variantIcons = getVariantIcons();

    return (
      <div className="space-y-2" data-testid={`enhanced-input-${label?.toLowerCase().replace(/\s+/g, '-')}`}>
        {label && (
          <div className="flex items-center justify-between">
            <Label 
              htmlFor={id}
              className={cn(
                "text-sm font-medium",
                required && "after:content-['*'] after:ml-0.5 after:text-destructive",
                error && "text-destructive"
              )}
            >
              {label}
            </Label>
            {showOptional && !required && (
              <Badge variant="secondary" className="text-xs">
                Optional
              </Badge>
            )}
          </div>
        )}

        <div className="relative">
          {/* Left Icon */}
          {(leftIcon || variantIcons.left) && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
              {leftIcon || variantIcons.left}
            </div>
          )}

          {/* Main Input */}
          <Input
            id={id}
            ref={ref}
            type={isPassword && showPassword ? "text" : props.type}
            value={value}
            onChange={onChange}
            className={cn(
              // Enhanced mobile-friendly sizing
              "min-h-[48px] text-base", // Even larger touch target for better mobile UX
              
              // Icon spacing
              (leftIcon || variantIcons.left) && "pl-10",
              (rightIcon || isPassword || clearable || loading || success) && "pr-12",
              
              // Validation states
              error && "border-destructive focus-visible:ring-destructive",
              success && "border-green-500 focus-visible:ring-green-500",
              
              // Enhanced focus state for better accessibility
              "focus:ring-2 focus:ring-offset-1",
              
              className
            )}
            aria-describedby={description ? `${id}-description` : undefined}
            aria-invalid={error ? "true" : undefined}
            {...props}
          />

          {/* Right Icons/Actions */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Loading Spinner */}
            {loading && (
              <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
            )}

            {/* Success Checkmark */}
            {success && !loading && (
              <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            {/* Clear Button */}
            {clearable && hasValue && !loading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted-foreground/10"
                onClick={onClear}
                data-testid="clear-input"
              >
                <X className="h-3 w-3" />
              </Button>
            )}

            {/* Password Toggle */}
            {isPassword && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted-foreground/10"
                onClick={() => setShowPassword(!showPassword)}
                data-testid="toggle-password"
              >
                {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            )}

            {/* Custom Right Icon */}
            {rightIcon && !isPassword && !clearable && !loading && !success && (
              <div className="text-muted-foreground">
                {rightIcon}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {description && (
          <p 
            id={`${id}-description`}
            className="text-xs text-muted-foreground"
          >
            {description}
          </p>
        )}

        {/* Error Message */}
        {error && (
          <p 
            className="text-xs text-destructive font-medium flex items-center gap-1"
            role="alert"
            data-testid={`error-${label?.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

EnhancedInput.displayName = "EnhancedInput";

interface QuickInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  variant?: "search" | "location" | "destination";
  className?: string;
  loading?: boolean;
}

/**
 * QuickInput Component
 * A streamlined input for quick actions like search or location entry
 */
export function QuickInput({ 
  value, 
  onChange, 
  onSubmit, 
  placeholder,
  variant = "search",
  className,
  loading 
}: QuickInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && onSubmit) {
      onSubmit();
    }
  };

  const getIcon = () => {
    switch (variant) {
      case "search":
        return <Search className="h-4 w-4" />;
      case "location":
        return <MapPin className="h-4 w-4" />;
      case "destination":
        return <Navigation className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn("relative", className)} data-testid={`quick-input-${variant}`}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {getIcon()}
      </div>
      
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        className={cn(
          "pl-10 pr-12 min-h-[44px] text-base",
          "focus:ring-2 focus:ring-offset-1"
        )}
        data-testid={`input-${variant}`}
      />

      {onSubmit && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3"
          onClick={onSubmit}
          disabled={!value.trim() || loading}
          data-testid={`submit-${variant}`}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            "Go"
          )}
        </Button>
      )}
    </div>
  );
}