import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";
import { useMeasurement } from "./measurement-provider";

interface RegionSelectorProps {
  variant?: "full" | "compact";
  className?: string;
}

export function RegionSelector({ variant = "full", className = "" }: RegionSelectorProps) {
  const { region, setRegion } = useMeasurement();

  if (variant === "compact") {
    return (
      <Select value={region} onValueChange={setRegion}>
        <SelectTrigger className={`w-32 ${className}`} data-testid="select-region">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="uk">UK</SelectItem>
          <SelectItem value="usa">USA</SelectItem>
          <SelectItem value="europe">Europe</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
        <Globe className="w-4 h-4" />
        Region / Speed Limit Style
      </Label>
      <Select value={region} onValueChange={setRegion}>
        <SelectTrigger 
          data-testid="select-region"
          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
          style={{ touchAction: 'manipulation' }}
        >
          <SelectValue placeholder="Select region" />
        </SelectTrigger>
        <SelectContent 
          className="z-[10000] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          position="popper"
          sideOffset={4}
        >
          <SelectItem value="uk" className="cursor-pointer">
            <div className="flex flex-col">
              <span className="text-gray-900 dark:text-gray-100">UK</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Circular red border, MPH</span>
            </div>
          </SelectItem>
          <SelectItem value="usa" className="cursor-pointer">
            <div className="flex flex-col">
              <span className="text-gray-900 dark:text-gray-100">USA</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Rectangular white/black, MPH</span>
            </div>
          </SelectItem>
          <SelectItem value="europe" className="cursor-pointer">
            <div className="flex flex-col">
              <span className="text-gray-900 dark:text-gray-100">Europe</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Circular red border, KPH</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
