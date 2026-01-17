"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { ChevronDown, Check } from "lucide-react"

function isIPadSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const isMobileSafari = /Safari/.test(ua) && /Mobile/.test(ua);
  const result = isIOS || isIPadOS || isMobileSafari;
  console.log('[NATIVE-SELECT] Detection:', { ua: ua.substring(0, 80), isIOS, isIPadOS, isMobileSafari, result });
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

interface DropdownPosition {
  top: number
  left: number
  width: number
}

const IPadCustomDropdown: React.FC<NativeSelectProps> = ({
  value,
  onValueChange,
  placeholder,
  className,
  children,
  "data-testid": dataTestId,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [position, setPosition] = React.useState<DropdownPosition | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  
  const items: { value: string; label: string }[] = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.props.value) {
      items.push({
        value: child.props.value,
        label: typeof child.props.children === 'string' ? child.props.children : String(child.props.children)
      });
    }
  });

  const selectedLabel = items.find(item => item.value === value)?.label || placeholder || 'Select...';

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const pos = {
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      };
      console.log('[NATIVE-SELECT] Custom dropdown opening at:', pos);
      setPosition(pos);
      setIsOpen(true);
    }
  };

  const handleSelect = (itemValue: string) => {
    onValueChange(itemValue);
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  React.useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
          handleClose();
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside as any);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside as any);
      };
    }
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        data-testid={dataTestId}
        className={cn(
          "flex w-full items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 px-3 py-2 ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          "min-h-[44px] text-base",
          "text-gray-900 dark:text-gray-100",
          className
        )}
      >
        <span className={!value ? "text-muted-foreground" : ""}>{selectedLabel}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      
      {isOpen && position && createPortal(
        <>
          <div 
            className="fixed inset-0 z-[99998]" 
            onClick={handleClose}
            onTouchStart={handleClose}
            style={{ backgroundColor: 'transparent' }}
          />
          <div
            className="fixed z-[99999] overflow-hidden rounded-md border bg-white dark:bg-slate-900 shadow-lg"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: '300px',
              overflowY: 'auto'
            }}
          >
            {items.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => handleSelect(item.value)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-3 text-base hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer",
                  item.value === value && "bg-blue-50 dark:bg-blue-900/30"
                )}
              >
                <span>{item.label}</span>
                {item.value === value && <Check className="h-4 w-4 text-blue-600" />}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  );
};

const NativeSelect: React.FC<NativeSelectProps> = (props) => {
  const [isIPad] = React.useState(() => isIPadSafari());
  
  if (isIPad) {
    return <IPadCustomDropdown {...props} />;
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

export { NativeSelect, NativeSelectItem }
