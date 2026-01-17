"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, ChevronDown } from "lucide-react"

function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const isMobileSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua) && !/CriOS/i.test(ua);
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const result = isIOS || isIPadOS || (isMobileSafari && isTouchDevice);
  console.warn('[NATIVE-SELECT] iOS Detection:', { isIOS, isIPadOS, isMobileSafari, isTouchDevice, result });
  return result;
}

interface NativeSelectProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  children: React.ReactNode
  "data-testid"?: string
}

interface NativeSelectItemProps {
  value: string
  children: React.ReactNode
}

const NativeSelectItem: React.FC<NativeSelectItemProps> = ({ value, children }) => {
  return <option value={value}>{children}</option>
}

const IOSRadioGroup: React.FC<NativeSelectProps> = ({
  value,
  onValueChange,
  placeholder,
  className,
  children,
  "data-testid": dataTestId,
}) => {
  const items: { value: string; label: string }[] = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.props.value) {
      items.push({
        value: child.props.value,
        label: typeof child.props.children === 'string' ? child.props.children : String(child.props.children)
      });
    }
  });

  return (
    <div 
      className={cn("flex flex-col gap-1", className)}
      data-testid={dataTestId}
    >
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onValueChange(item.value)}
          className={cn(
            "flex items-center justify-between px-3 py-2.5 rounded-md border text-left transition-colors",
            "min-h-[44px] text-base",
            item.value === value
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
          )}
        >
          <span>{item.label}</span>
          {item.value === value && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />}
        </button>
      ))}
    </div>
  );
};

const NativeSelect: React.FC<NativeSelectProps> = (props) => {
  const [isIOS] = React.useState(() => isIOSDevice());
  
  console.warn('[NATIVE-SELECT] Rendering, isIOS:', isIOS);
  
  if (isIOS) {
    console.warn('[NATIVE-SELECT] Using iOS RADIO BUTTONS');
    return <IOSRadioGroup {...props} />;
  }
  
  const {
    value,
    onValueChange,
    placeholder,
    className,
    children,
    "data-testid": dataTestId,
  } = props;
  
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        data-testid={dataTestId}
        className={cn(
          "flex w-full items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 px-3 py-2 pr-8 ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer appearance-none",
          "min-h-[44px] text-base",
          "text-gray-900 dark:text-gray-100",
          className
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
    </div>
  )
}

export { NativeSelect, NativeSelectItem }
