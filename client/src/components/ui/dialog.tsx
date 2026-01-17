"use client"

import * as React from "react"
import * as ReactDOM from "react-dom"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

function isIPadSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIOS || isIPadOS;
}

function getOrCreateIPadDialogContainer(): HTMLElement {
  let container = document.getElementById('ipad-dialog-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'ipad-dialog-container';
    container.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:9999;transform:none!important;-webkit-transform:none!important;';
    document.body.appendChild(container);
  }
  return container;
}

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & { zIndex?: number }
>(({ className, zIndex, style, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 flex items-start md:items-center justify-center pt-[5vh] md:pt-0",
      className
    )}
    style={{ 
      ...style,
      transform: 'none',
      ...(zIndex ? { zIndex } : {})
    }}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const InlineDialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { zIndex?: number }
>(({ className, zIndex, style, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 flex items-start md:items-center justify-center pt-[5vh] md:pt-0",
      className
    )}
    style={{ 
      ...style,
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      transform: 'none',
      ...(zIndex ? { zIndex } : {})
    }}
    {...props}
  />
))
InlineDialogOverlay.displayName = "InlineDialogOverlay"

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { overlayZIndex?: number }
>(({ className, children, overlayZIndex, ...props }, ref) => {
  const [isIPad] = React.useState(() => isIPadSafari());
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  
  React.useEffect(() => {
    if (isIPad && typeof document !== 'undefined') {
      setContainer(getOrCreateIPadDialogContainer());
    }
  }, [isIPad]);
  
  if (isIPad && container) {
    return ReactDOM.createPortal(
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: overlayZIndex || 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          pointerEvents: 'auto',
          transform: 'none',
          WebkitTransform: 'none',
        }}
      >
        <DialogPrimitive.Content asChild forceMount>
          <div
            ref={ref}
            className={cn(
              "grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
              "max-h-[90vh] overflow-y-auto",
              "touch-pan-y overscroll-contain",
              className
            )}
            style={{ 
              position: 'static',
              transform: 'none',
              WebkitTransform: 'none',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y'
            }}
            {...props}
          >
            {children}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground min-w-[44px] min-h-[44px] flex items-center justify-center">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </div>,
      container
    );
  }
  
  if (isIPad && !container) {
    return null;
  }
  
  return (
    <DialogPortal>
      <DialogOverlay zIndex={overlayZIndex} />
      <DialogPrimitive.Content asChild>
        <div
          ref={ref}
          className={cn(
            "z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg",
            "max-h-[90vh]",
            "touch-pan-y overscroll-contain",
            className
          )}
          style={{ 
            position: 'relative',
            transform: 'none',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y'
          }}
          {...props}
        >
          {children}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </div>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
