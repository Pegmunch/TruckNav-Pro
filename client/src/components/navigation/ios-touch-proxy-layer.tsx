import { useEffect, useState, useCallback, useRef } from 'react';
import { buttonRegistry } from './right-action-stack';

interface ProxyButton {
  id: string;
  rect: DOMRect;
  callback: () => void;
}

export function IOSTouchProxyLayer() {
  const [proxyButtons, setProxyButtons] = useState<ProxyButton[]>([]);
  const isIOS = useRef(false);
  
  useEffect(() => {
    isIOS.current = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (!isIOS.current) {
      console.log('[IOS-TOUCH-PROXY] Not iOS - proxy layer disabled');
      return;
    }
    
    console.log('[IOS-TOUCH-PROXY] iOS detected - activating touch proxy layer');
    
    const updateProxies = () => {
      const proxies: ProxyButton[] = [];
      Array.from(buttonRegistry.entries()).forEach(([id, registration]) => {
        const rect = registration.getRect();
        if (rect && rect.width > 0 && rect.height > 0) {
          proxies.push({
            id,
            rect,
            callback: registration.callback
          });
        }
      });
      console.log(`[IOS-TOUCH-PROXY] Updated ${proxies.length} proxy buttons`);
      setProxyButtons(proxies);
    };
    
    updateProxies();
    const interval = setInterval(updateProxies, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleProxyTouch = useCallback((e: React.TouchEvent, button: ProxyButton) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`[IOS-TOUCH-PROXY] ✅ Proxy touch captured for: ${button.id}`);
    
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    
    button.callback();
  }, []);
  
  if (!isIOS.current || proxyButtons.length === 0) {
    return null;
  }
  
  return (
    <div 
      className="ios-touch-proxy-layer"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        pointerEvents: 'none',
      }}
    >
      {proxyButtons.map((button) => (
        <div
          key={button.id}
          data-proxy-for={button.id}
          onTouchStart={(e) => handleProxyTouch(e, button)}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          style={{
            position: 'fixed',
            top: button.rect.top - 5,
            left: button.rect.left - 5,
            width: button.rect.width + 10,
            height: button.rect.height + 10,
            pointerEvents: 'auto',
            touchAction: 'none',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
          }}
        />
      ))}
    </div>
  );
}
