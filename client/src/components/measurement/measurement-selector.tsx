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
      <Label className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
        <Ruler className="w-4 h-4" />
        Measurement System
      </Label>
      <Select value={system} onValueChange={setSystem}>
        <SelectTrigger 
          data-testid="select-measurement-system"
          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
          style={{ touchAction: 'manipulation' }}
        >
          <SelectValue placeholder="Select unit system" />
        </SelectTrigger>
        <SelectContent 
          className="z-[10000] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          position="popper"
          sideOffset={4}
        >
          <SelectItem value="metric" className="cursor-pointer">
            <div className="flex flex-col">
              <span className="text-gray-900 dark:text-gray-100">Metric</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">km/h, kilometers, meters</span>
            </div>
          </SelectItem>
          <SelectItem value="imperial" className="cursor-pointer">
            <div className="flex flex-col">
              <span className="text-gray-900 dark:text-gray-100">Imperial</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">mph, miles, feet</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}