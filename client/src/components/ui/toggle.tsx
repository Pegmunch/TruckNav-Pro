import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cn } from "@/lib/utils";
const Toggle = React.forwardRef<React.ElementRef<typeof TogglePrimitive.Root>, React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <TogglePrimitive.Root ref={ref} className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium", className)} {...props} />
  )
);
Toggle.displayName = TogglePrimitive.Root.displayName;
export { Toggle };
