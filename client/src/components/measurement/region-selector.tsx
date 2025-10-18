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
      <Label className="flex items-center gap-2">
        <Globe className="w-4 h-4" />
        Region / Speed Limit Style
      </Label>
      <Select value={region} onValueChange={setRegion}>
        <SelectTrigger data-testid="select-region">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="uk">
            <div className="flex flex-col">
              <span>UK</span>
              <span className="text-xs text-muted-foreground">Circular red border, MPH</span>
            </div>
          </SelectItem>
          <SelectItem value="usa">
            <div className="flex flex-col">
              <span>USA</span>
              <span className="text-xs text-muted-foreground">Rectangular white/black, MPH</span>
            </div>
          </SelectItem>
          <SelectItem value="europe">
            <div className="flex flex-col">
              <span>Europe</span>
              <span className="text-xs text-muted-foreground">Circular red border, KPH</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
