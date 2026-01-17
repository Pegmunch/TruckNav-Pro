"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function isIPadSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIOS || isIPadOS;
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

const RadixSelectItem: React.FC<NativeSelectItemProps> = ({ value, children }) => {
  return <SelectItem value={value}>{children}</SelectItem>
}

const NativeSelect: React.FC<NativeSelectProps> = ({
  value,
  onValueChange,
  placeholder,
  className,
  children,
  "data-testid": dataTestId,
}) => {
  const [isIPad] = React.useState(() => isIPadSafari());
  
  if (isIPad) {
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
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger 
          className={cn("min-h-[44px] text-base", className)}
          data-testid={dataTestId}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent 
          position="popper" 
          sideOffset={4}
          className="z-[99999]"
          style={{ 
            transform: 'none',
            WebkitTransform: 'none'
          }}
        >
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value} className="min-h-[44px] text-base">
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      data-testid={dataTestId}
      style={{
        WebkitAppearance: 'menulist',
        MozAppearance: 'menulist',
        appearance: 'menulist',
      }}
      className={cn(
        "flex w-full items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 px-3 py-2 ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
        "h-10 text-sm",
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
  )
}

export { NativeSelect, NativeSelectItem, RadixSelectItem }
