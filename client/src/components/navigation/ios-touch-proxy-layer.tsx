import { useEffect, useRef, useCallback } from 'react';
import { buttonRegistry } from './right-action-stack';

const PROXY_CONTAINER_ID = 'ios-touch-proxy-container';

export function IOSTouchProxyLayer() {
  const isIOS = useRef(false);
  const proxyMapRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const createProxyButton = useCallback((id: string, registration: { getRect: () => DOMRect | null; callback: () => void }) => {
    const rect = registration.getRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    
    const proxy = document.createElement('div');
    proxy.setAttribute('data-proxy-id', id);
    proxy.style.cssText = `
      position: fixed !important;
      top: ${rect.top - 15}px !important;
      left: ${rect.left - 15}px !important;
      width: ${rect.width + 30}px !important;
      height: ${rect.height + 30}px !important;
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
      console.log(`[IOS-TOUCH-PROXY] ✅ ${eventType} captured for: ${id}`);
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      if (navigator.vibrate) navigator.vibrate(10);
      
      const currentReg = buttonRegistry.get(id);
      if (currentReg) {
        currentReg.callback();
      }
    };
    
    proxy.ontouchstart = (e) => handleAction(e, 'ontouchstart');
    proxy.ontouchend = (e) => { e.preventDefault(); e.stopPropagation(); };
    proxy.onpointerdown = (e) => handleAction(e, 'onpointerdown');
    proxy.onclick = (e) => handleAction(e, 'onclick');
    
    return proxy;
  }, []);
  
  const updateProxyPosition = useCallback((proxy: HTMLDivElement, rect: DOMRect) => {
    proxy.style.top = `${rect.top - 15}px`;
    proxy.style.left = `${rect.left - 15}px`;
    proxy.style.width = `${rect.width + 30}px`;
    proxy.style.height = `${rect.height + 30}px`;
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
        if (existingProxy) {
          updateProxyPosition(existingProxy, rect);
        } else {
          const newProxy = createProxyButton(id, registration);
          if (newProxy) {
            containerRef.current!.appendChild(newProxy);
            proxyMapRef.current.set(id, newProxy);
          }
        }
      });
      
      console.log(`[IOS-TOUCH-PROXY] Synced ${proxyMapRef.current.size} proxy buttons`);
    };
    
    updateProxies();
    const interval = setInterval(updateProxies, 500);
    
    return () => {
      clearInterval(interval);
    };
  }, [createProxyButton, updateProxyPosition]);
  
  return null;
}
