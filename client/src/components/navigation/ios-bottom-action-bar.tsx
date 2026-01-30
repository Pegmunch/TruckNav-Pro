import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Activity } from 'lucide-react';

interface IOSBottomActionBarProps {
  isNavigating: boolean;
  isPreviewMode: boolean;
  showTraffic: boolean;
  onReportIncident: () => void;
  onToggleTraffic: () => void;
}

export function IOSBottomActionBar({
  isNavigating,
  isPreviewMode,
  showTraffic,
  onReportIncident,
  onToggleTraffic
}: IOSBottomActionBarProps) {
  const [mounted, setMounted] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);
    if (iOS) {
      console.log('[IOS-BOTTOM-BAR] iOS detected - rendering bottom action bar');
    }
  }, []);
  
  const shouldShow = (isNavigating || isPreviewMode) && isIOS;
  
  if (!mounted || !shouldShow) return null;
  
  const handleIncidentTouch = (e: React.TouchEvent | React.MouseEvent) => {
    console.log('[IOS-BOTTOM-BAR] ✅ Incident button touched');
    e.preventDefault();
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate(15);
    onReportIncident();
  };
  
  const handleTrafficTouch = (e: React.TouchEvent | React.MouseEvent) => {
    console.log('[IOS-BOTTOM-BAR] ✅ Traffic button touched');
    e.preventDefault();
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate(15);
    onToggleTraffic();
  };
  
  const barContent = (
    <div
      id="ios-bottom-action-bar"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '70px',
        paddingBottom: 'env(safe-area-inset-bottom, 10px)',
        background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.8))',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '30px',
        zIndex: 2147483646,
        pointerEvents: 'auto',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        borderTop: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      <button
        type="button"
        onTouchStart={handleIncidentTouch}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onClick={handleIncidentTouch}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #f97316, #ea580c)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(249,115,22,0.4)',
          pointerEvents: 'auto',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          outline: 'none'
        }}
      >
        <AlertTriangle size={22} color="white" strokeWidth={2.5} />
        <span style={{ fontSize: '8px', color: 'white', fontWeight: 600 }}>Report</span>
      </button>
      
      <button
        type="button"
        onTouchStart={handleTrafficTouch}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onClick={handleTrafficTouch}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: showTraffic ? '2px solid #22c55e' : '2px solid rgba(255,255,255,0.3)',
          background: showTraffic 
            ? 'linear-gradient(135deg, rgba(34,197,94,0.3), rgba(22,163,74,0.3))'
            : 'rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          cursor: 'pointer',
          boxShadow: showTraffic ? '0 4px 15px rgba(34,197,94,0.3)' : 'none',
          pointerEvents: 'auto',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          outline: 'none'
        }}
      >
        <Activity size={22} color={showTraffic ? '#22c55e' : 'white'} strokeWidth={2.5} />
        <span style={{ fontSize: '8px', color: showTraffic ? '#22c55e' : 'white', fontWeight: 600 }}>Traffic</span>
      </button>
    </div>
  );
  
  return createPortal(barContent, document.body);
}
