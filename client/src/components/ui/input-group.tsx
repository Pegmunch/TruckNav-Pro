import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface InputGroupProps {
  title?: string;
  description?: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "card" | "minimal";
  orientation?: "vertical" | "horizontal";
}

/**
 * InputGroup Component
 * Groups related input fields with optional title and description
 * Provides consistent spacing and visual organization
 */
export function InputGroup({
  title,
  description,
  badge,
  children,
  className,
  variant = "default",
  orientation = "vertical"
}: InputGroupProps) {
  const content = (
    <div className={cn(
      "space-y-4",
      orientation === "horizontal" && "space-y-0 space-x-4 flex flex-wrap items-end",
      className
    )}>
      {(title || description || badge) && (
        <div className="space-y-1">
          {title && (
            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold text-foreground">
                {title}
              </Label>
              {badge && (
                <Badge variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
      
      <div className={cn(
        "space-y-3",
        orientation === "horizontal" && "space-y-0 space-x-3 flex flex-wrap items-center",
        "mobile-input-spacing" // Custom class for mobile optimization
      )}>
        {children}
      </div>
    </div>
  );

  if (variant === "card") {
    return (
      <Card className={cn("p-4", className)}>
        {title && (
          <CardHeader className="pb-3 px-0 pt-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{title}</CardTitle>
              {badge && (
                <Badge variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </CardHeader>
        )}
        <CardContent className="px-0 pb-0">
          <div className={cn(
            "space-y-3",
            orientation === "horizontal" && "space-y-0 space-x-3 flex flex-wrap items-center"
          )}>
            {children}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "minimal") {
    return (
      <div className={cn("space-y-2", className)}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {content}
      {variant === "default" && (title || description) && (
        <Separator className="my-4" />
      )}
    </div>
  );
}

interface FieldGroupProps {
  label?: string;
  description?: string;
  required?: boolean;
  showOptional?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
  layout?: "stacked" | "inline";
}

/**
 * FieldGroup Component
 * Groups a single field with its label, description, and error message
 * Optimized for mobile touch targets and accessibility
 */
export function FieldGroup({
  label,
  description,
  required,
  showOptional,
  error,
  children,
  className,
  layout = "stacked"
}: FieldGroupProps) {
  const id = React.useId();

  return (
    <div className={cn(
      "space-y-2",
      layout === "inline" && "space-y-0 space-x-3 flex items-center",
      "mobile-field-group", // Custom class for mobile optimization
      className
    )} data-testid={`field-group-${label?.toLowerCase().replace(/\s+/g, '-')}`}>
      {label && (
        <Label 
          htmlFor={id}
          className={cn(
            "text-sm font-medium",
            required && "after:content-['*'] after:ml-0.5 after:text-destructive",
            error && "text-destructive",
            layout === "inline" && "min-w-0 flex-shrink-0"
          )}
        >
          {label}
        </Label>
      )}
      
      <div className={cn(
        "space-y-1",
        layout === "inline" && "space-y-0 flex-1"
      )}>
        <div id={id}>
          {children}
        </div>
        
        {description && (
          <p 
            id={`${id}-description`}
            className="text-xs text-muted-foreground"
          >
            {description}
          </p>
        )}
        
        {error && (
          <p 
            className="text-xs text-destructive font-medium"
            role="alert"
            data-testid={`error-${label?.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

interface ActionGroupProps {
  children: React.ReactNode;
  className?: string;
  alignment?: "left" | "center" | "right" | "between";
  orientation?: "horizontal" | "vertical";
  sticky?: boolean;
}

/**
 * ActionGroup Component
 * Groups action buttons with consistent spacing and alignment
 * Supports sticky positioning for form actions
 */
export function ActionGroup({
  children,
  className,
  alignment = "right",
  orientation = "horizontal",
  sticky = false
}: ActionGroupProps) {
  return (
    <div className={cn(
      "flex gap-2",
      orientation === "vertical" && "flex-col",
      orientation === "horizontal" && "flex-row",
      alignment === "left" && "justify-start",
      alignment === "center" && "justify-center", 
      alignment === "right" && "justify-end",
      alignment === "between" && "justify-between",
      sticky && "sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t p-4 -mx-4 -mb-4",
      "mobile-action-group", // Custom class for mobile optimization
      className
    )} data-testid="action-group">
      {children}
    </div>
  );
}

interface StepperProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

/**
 * Stepper Component
 * Shows progress through multi-step forms
 */
export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn("mb-6", className)} data-testid="form-stepper">
      <div className="flex items-center">
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <div className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                index <= currentStep 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}>
                {index + 1}
              </div>
              <span className={cn(
                "ml-2 text-sm font-medium hidden sm:inline",
                index <= currentStep ? "text-foreground" : "text-muted-foreground"
              )}>
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-2 sm:mx-4",
                index < currentStep ? "bg-primary" : "bg-muted"
              )} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}