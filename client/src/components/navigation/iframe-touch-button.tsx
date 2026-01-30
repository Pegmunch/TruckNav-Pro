import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface IframeTouchButtonProps {
  onClick: () => void;
  isNavigating: boolean;
  isVisible: boolean;
  buttonType: "incident" | "traffic";
  showTraffic?: boolean;
  topPosition: number;
}

export function IframeTouchButton({
  onClick,
  isNavigating,
  isVisible,
  buttonType,
  showTraffic,
  topPosition,
}: IframeTouchButtonProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isIframeReady, setIsIframeReady] = useState(false);

  useEffect(() => {
    if (!isNavigating || !isVisible) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    const setupIframe = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;

        const bgColor = buttonType === "incident" ? "#f97316" : (showTraffic ? "#22c55e" : "#6b7280");
        const icon = buttonType === "incident" 
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.19M15 6h2.81A2 2 0 0 1 20 8v8a2 2 0 0 1-2 2h-2"/><path d="M12 2v20"/><path d="M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4"/><path d="m5 14 7-7 7 7"/></svg>`;

        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              html, body { 
                width: 100%; 
                height: 100%; 
                overflow: hidden;
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                user-select: none;
              }
              button {
                width: 100%;
                height: 100%;
                border: none;
                background: ${bgColor};
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
              }
              button:active {
                transform: scale(0.95);
                opacity: 0.9;
              }
            </style>
          </head>
          <body>
            <button id="btn">${icon}</button>
            <script>
              const btn = document.getElementById('btn');
              let touchStarted = false;
              
              btn.addEventListener('touchstart', function(e) {
                e.preventDefault();
                e.stopPropagation();
                touchStarted = true;
                console.log('[IFRAME-${buttonType.toUpperCase()}] touchstart');
                window.parent.postMessage({ type: 'button-${buttonType}-click' }, '*');
              }, { passive: false, capture: true });
              
              btn.addEventListener('touchend', function(e) {
                e.preventDefault();
                e.stopPropagation();
                touchStarted = false;
              }, { passive: false, capture: true });
              
              btn.addEventListener('click', function(e) {
                if (!touchStarted) {
                  console.log('[IFRAME-${buttonType.toUpperCase()}] click');
                  window.parent.postMessage({ type: 'button-${buttonType}-click' }, '*');
                }
              });
              
              btn.addEventListener('pointerdown', function(e) {
                console.log('[IFRAME-${buttonType.toUpperCase()}] pointerdown');
              });
            </script>
          </body>
          </html>
        `);
        doc.close();
        
        setIsIframeReady(true);
        console.log(`[IFRAME-TOUCH-BUTTON] ${buttonType} iframe ready`);
      } catch (err) {
        console.error(`[IFRAME-TOUCH-BUTTON] Error setting up ${buttonType} iframe:`, err);
      }
    };

    if (iframe.contentDocument?.readyState === 'complete') {
      setupIframe();
    } else {
      iframe.onload = setupIframe;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === `button-${buttonType}-click`) {
        console.log(`[IFRAME-TOUCH-BUTTON] ${buttonType} button clicked via postMessage`);
        onClick();
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isNavigating, isVisible, buttonType, showTraffic, onClick]);

  if (!isNavigating || !isVisible) return null;

  const container = document.body;

  return createPortal(
    <iframe
      ref={iframeRef}
      title={`${buttonType}-touch-button`}
      style={{
        position: 'fixed',
        top: `${topPosition}px`,
        right: '12px',
        width: '44px',
        height: '44px',
        border: 'none',
        background: 'transparent',
        zIndex: 2147483647,
        pointerEvents: 'auto',
        touchAction: 'manipulation',
      }}
      sandbox="allow-scripts allow-same-origin"
    />,
    container
  );
}

export function IframeIncidentButton(props: Omit<IframeTouchButtonProps, 'buttonType' | 'topPosition'>) {
  return <IframeTouchButton {...props} buttonType="incident" topPosition={120} />;
}

export function IframeTrafficButton(props: Omit<IframeTouchButtonProps, 'buttonType' | 'topPosition'> & { showTraffic: boolean }) {
  return <IframeTouchButton {...props} buttonType="traffic" topPosition={170} />;
}
