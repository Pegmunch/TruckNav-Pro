import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Ruler } from "lucide-react";
import { useMeasurement } from "./measurement-provider";

interface MeasurementSelectorProps {
  variant?: "full" | "compact";
  className?: string;
}

export function MeasurementSelector({ variant = "full", className = "" }: MeasurementSelectorProps) {
  const { system, setSystem } = useMeasurement();

  if (variant === "compact") {
    return (
      <Select value={system} onValueChange={setSystem}>
        <SelectTrigger className={`w-32 ${className}`} data-testid="select-measurement-system">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="metric">Metric</SelectItem>
          <SelectItem value="imperial">Imperial</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="flex items-center gap-2">
        <Ruler className="w-4 h-4" />
        Measurement System
      </Label>
      <Select value={system} onValueChange={setSystem}>
        <SelectTrigger data-testid="select-measurement-system">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="metric">
            <div className="flex flex-col">
              <span>Metric</span>
              <span className="text-xs text-muted-foreground">km/h, kilometers, meters</span>
            </div>
          </SelectItem>
          <SelectItem value="imperial">
            <div className="flex flex-col">
              <span>Imperial</span>
              <span className="text-xs text-muted-foreground">mph, miles, feet</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}