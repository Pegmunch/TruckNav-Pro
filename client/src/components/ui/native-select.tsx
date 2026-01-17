"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

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

const NativeSelect: React.FC<NativeSelectProps> = ({
  value,
  onValueChange,
  placeholder,
  className,
  children,
  "data-testid": dataTestId,
}) => {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        data-testid={dataTestId}
        className={cn(
          "flex w-full items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 px-3 py-2 ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer",
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
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
    </div>
  )
}

export { NativeSelect, NativeSelectItem }
