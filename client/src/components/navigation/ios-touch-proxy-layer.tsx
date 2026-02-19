import { useEffect, useRef, useCallback } from 'react';
import { buttonRegistry, globalDebounce } from './right-action-stack';

const PROXY_CONTAINER_ID = 'ios-touch-proxy-container';
const PROXY_DEBOUNCE = 400;
const proxyLastFired = new Map<string, number>();

function canProxyFire(id: string): boolean {
  const last = proxyLastFired.get(id) || 0;
  return Date.now() - last > PROXY_DEBOUNCE;
}

function markProxyFiredEverywhere(id: string): void {
  const now = Date.now();
  proxyLastFired.set(id, now);
  globalDebounce.set(id, now);
  const reg = buttonRegistry.get(id);
  if (reg) {
    reg.lastFired = now;
  }
}

export function IOSTouchProxyLayer() {
  const isIOS = useRef(false);
  const proxyMapRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const createProxyButton = useCallback((id: string, registration: { getRect: () => DOMRect | null; callback: () => void; touchPadding?: number }) => {
    const rect = registration.getRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    
    const pad = registration.touchPadding ?? 6;
    const proxy = document.createElement('div');
    proxy.setAttribute('data-proxy-id', id);
    proxy.style.cssText = `
      position: fixed !important;
      top: ${rect.top - pad}px !important;
      left: ${rect.left - pad}px !important;
      width: ${rect.width + pad * 2}px !important;
      height: ${rect.height + pad * 2}px !important;
      z-index: 2147483647 !important;
      pointer-events: auto !important;
      touch-action: manipulation !important;
      -webkit-touch-callout: none !important;
      -webkit-user-select: none !important;
      user-select: none !important;
      background: rgba(255,0,0,0.0) !important;
      cursor: pointer !important;
      border: none !important;
      outline: none !important;
    `;
    
    const handleAction = (e: Event, eventType: string) => {
      // Check if a dialog/modal is open - if so, don't intercept events
      const openDialog = document.querySelector('[data-state="open"][role="dialog"]');
      const openSheet = document.querySelector('[data-state="open"][data-vaul-drawer]');
      if (openDialog || openSheet) {
        console.log(`[IOS-TOUCH-PROXY] Dialog/modal open - ignoring ${eventType} for: ${id}`);
        return; // Let the event propagate to the dialog
      }
      
      // Get touch coordinates
      let touchX = 0, touchY = 0;
      if (e instanceof TouchEvent && e.touches.length > 0) {
        touchX = e.touches[0].clientX;
        touchY = e.touches[0].clientY;
      } else if (e instanceof PointerEvent || e instanceof MouseEvent) {
        touchX = e.clientX;
        touchY = e.clientY;
      }
      
      // Find the CLOSEST button to the touch point (not just the hit proxy)
      // This handles overlapping proxy areas correctly
      let closestId = id;
      let closestDistance = Infinity;
      
      for (const [btnId, btnReg] of Array.from(buttonRegistry.entries())) {
        const btnRect = btnReg.getRect();
        if (!btnRect || btnRect.width === 0) continue;
        
        // Calculate center of button
        const centerX = btnRect.left + btnRect.width / 2;
        const centerY = btnRect.top + btnRect.height / 2;
        const distance = Math.sqrt(Math.pow(touchX - centerX, 2) + Math.pow(touchY - centerY, 2));
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestId = btnId;
        }
      }
      
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      if (!canProxyFire(closestId)) {
        console.log(`[IOS-TOUCH-PROXY] ⏳ Debounced ${closestId} (${eventType})`);
        return;
      }
      
      console.log(`[IOS-TOUCH-PROXY] ✅ ${eventType} firing: ${closestId}`);
      markProxyFiredEverywhere(closestId);
      
      if (navigator.vibrate) navigator.vibrate(10);
      
      const currentReg = buttonRegistry.get(closestId);
      if (currentReg) {
        currentReg.callback();
      }
    };
    
    proxy.ontouchstart = (e) => handleAction(e, 'ontouchstart');
    proxy.ontouchend = (e) => { e.preventDefault(); e.stopPropagation(); };
    proxy.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); };
    proxy.onclick = (e) => { e.preventDefault(); e.stopPropagation(); };
    
    return proxy;
  }, []);
  
  const updateProxyPosition = useCallback((proxy: HTMLDivElement, rect: DOMRect, pad: number = 6) => {
    proxy.style.top = `${rect.top - pad}px`;
    proxy.style.left = `${rect.left - pad}px`;
    proxy.style.width = `${rect.width + pad * 2}px`;
    proxy.style.height = `${rect.height + pad * 2}px`;
  }, []);
  
  useEffect(() => {
    isIOS.current = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (!isIOS.current) {
      console.log('[IOS-TOUCH-PROXY] Not iOS - disabled');
      return;
    }
    
    console.log('[IOS-TOUCH-PROXY] iOS detected - creating permanent proxy layer');
    
    let container = document.getElementById(PROXY_CONTAINER_ID) as HTMLDivElement;
    if (!container) {
      container = document.createElement('div');
      container.id = PROXY_CONTAINER_ID;
      container.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 2147483647 !important;
        pointer-events: none !important;
      `;
      document.body.appendChild(container);
    }
    containerRef.current = container;
    
    const updateProxies = () => {
      if (!containerRef.current) return;
      
      // Check if any dialog/modal/overlay is open - if so, disable entire proxy container
      const openDialog = document.querySelector('[data-state="open"][role="dialog"]');
      const openSheet = document.querySelector('[data-state="open"][data-vaul-drawer]');
      const openOverlay = document.querySelector('[data-radix-dialog-overlay]');
      const openAlertDialog = document.querySelector('[role="alertdialog"]');
      const openSettingsPanel = document.querySelector('[data-settings-overlay="true"]');
      const dialogOpen = !!(openDialog || openSheet || openOverlay || openAlertDialog || openSettingsPanel);
      
      // Hide entire container when any modal is open
      containerRef.current.style.display = dialogOpen ? 'none' : 'block';
      
      const currentIds = new Set(buttonRegistry.keys());
      const existingIds = new Set(proxyMapRef.current.keys());
      
      existingIds.forEach(id => {
        if (!currentIds.has(id)) {
          const proxy = proxyMapRef.current.get(id);
          if (proxy && proxy.parentNode) {
            proxy.parentNode.removeChild(proxy);
          }
          proxyMapRef.current.delete(id);
        }
      });
      
      buttonRegistry.forEach((registration, id) => {
        const rect = registration.getRect();
        if (!rect || rect.width === 0 || rect.height === 0) {
          const existing = proxyMapRef.current.get(id);
          if (existing && existing.parentNode) {
            existing.parentNode.removeChild(existing);
            proxyMapRef.current.delete(id);
          }
          return;
        }
        
        const existingProxy = proxyMapRef.current.get(id);
        const pad = registration.touchPadding ?? 6;
        if (existingProxy) {
          updateProxyPosition(existingProxy, rect, pad);
          existingProxy.style.pointerEvents = dialogOpen ? 'none' : 'auto';
        } else {
          const newProxy = createProxyButton(id, registration);
          if (newProxy) {
            // Disable pointer events when dialog is open
            newProxy.style.pointerEvents = dialogOpen ? 'none' : 'auto';
            containerRef.current!.appendChild(newProxy);
            proxyMapRef.current.set(id, newProxy);
          }
        }
      });
      
      
    };
    
    updateProxies();
    const interval = setInterval(updateProxies, 500);
    
    return () => {
      clearInterval(interval);
    };
  }, [createProxyButton, updateProxyPosition]);
  
  return null;
}
