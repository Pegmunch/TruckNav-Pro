"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"
import { useIsMobile } from "@/hooks/use-mobile"

import { cn } from "@/lib/utils"

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => {
  const isMobile = useIsMobile()
  
  return (
    <DrawerPrimitive.Root
      shouldScaleBackground={isMobile ? shouldScaleBackground : false}
      direction="bottom"
      {...props}
    />
  )
}
Drawer.displayName = "Drawer"

const DrawerTrigger = DrawerPrimitive.Trigger

const DrawerPortal = DrawerPrimitive.Portal

const DrawerClose = DrawerPrimitive.Close

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const isMobile = useIsMobile()
  
  return (
    <DrawerPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm",
        isMobile ? [
          "mobile-drawer-overlay",
          "data-[state=open]:opacity-100 data-[state=closed]:opacity-0",
          "data-[state=open]:pointer-events-auto data-[state=closed]:pointer-events-none"
        ] : "bg-black/80",
        className
      )}
      {...props}
    />
  )
})
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const isMobile = useIsMobile()
  
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex h-auto flex-col bg-background border-t",
          isMobile ? [
            "mobile-drawer",
            "rounded-t-[20px]",
            "max-h-[var(--drawer-height)]",
            "data-[state=open]:translate-y-0 data-[state=closed]:translate-y-full"
          ] : [
            "rounded-t-[10px]",
            "mt-24"
          ],
          className
        )}
        {...props}
      >
        <div className={cn(
          "mx-auto rounded-full bg-muted-foreground/60",
          isMobile ? "drawer-handle w-9 h-1 mt-3 mb-4" : "mt-4 h-2 w-[100px]"
        )} />
        <div className={cn(
          "flex-1 overflow-hidden",
          isMobile ? "drawer-content pb-[calc(var(--safe-area-inset-bottom)+1rem)]" : "px-4 pb-4"
        )}>
          {children}
        </div>
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
})
DrawerContent.displayName = "DrawerContent"

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const isMobile = useIsMobile()
  
  return (
    <div
      className={cn(
        "grid gap-1.5 text-center sm:text-left",
        isMobile ? "mobile-nav-header px-4 py-3" : "p-4",
        className
      )}
      {...props}
    />
  )
}
DrawerHeader.displayName = "DrawerHeader"

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const isMobile = useIsMobile()
  
  return (
    <div
      className={cn(
        "mt-auto flex flex-col gap-2",
        isMobile ? "mobile-safe-bottom px-4" : "p-4",
        className
      )}
      {...props}
    />
  )
}
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      "mobile-text-xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("mobile-text-sm text-muted-foreground", className)}
    {...props}
  />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
