/**
 * Navigation Button Test Simulation
 * Run from browser console: window.testNavButtons()
 * 
 * Tests:
 * 1. Incident button tap in navigation mode
 * 2. Double-tap show/hide functionality
 */

export function simulateNavButtonTest() {
  console.log('='.repeat(60));
  console.log('[NAV-TEST] 🧪 Starting Navigation Button Simulation');
  console.log('='.repeat(60));
  
  // Step 1: Check current mode
  const mobileNavMode = localStorage.getItem('mobileNavMode') || 'plan';
  const isLocalNavActive = localStorage.getItem('navigation_ui_active') === 'true';
  
  console.log('[NAV-TEST] Current state:');
  console.log(`  - mobileNavMode from localStorage: ${mobileNavMode}`);
  console.log(`  - isLocalNavActive: ${isLocalNavActive}`);
  
  // Step 2: Find the incident button (outside version)
  const incidentBtnOutside = document.querySelector('[data-testid="button-incident-outside"]') as HTMLButtonElement;
  const incidentsBtnOutside = document.querySelector('[data-testid="button-incidents-outside"]') as HTMLButtonElement;
  
  console.log('[NAV-TEST] Button presence check:');
  console.log(`  - Incident report button (outside): ${incidentBtnOutside ? '✅ FOUND' : '❌ NOT FOUND'}`);
  console.log(`  - View incidents button (outside): ${incidentsBtnOutside ? '✅ FOUND' : '❌ NOT FOUND'}`);
  
  // Step 3: Check if buttons are visible (not hidden by showNavControls)
  if (incidentBtnOutside) {
    const rect = incidentBtnOutside.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0;
    const computedStyle = window.getComputedStyle(incidentBtnOutside);
    
    console.log('[NAV-TEST] Incident button visibility:');
    console.log(`  - Visible (has dimensions): ${isVisible ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Display: ${computedStyle.display}`);
    console.log(`  - Pointer-events: ${computedStyle.pointerEvents}`);
    console.log(`  - Position: ${rect.left}x${rect.top} (${rect.width}x${rect.height})`);
    
    // Step 4: Simulate click
    console.log('[NAV-TEST] 🖱️ Simulating incident button click...');
    incidentBtnOutside.click();
    
    // Check if dialog opened
    setTimeout(() => {
      const incidentDialog = document.querySelector('[role="dialog"]');
      console.log(`[NAV-TEST] Incident dialog opened: ${incidentDialog ? '✅ YES' : '❌ NO'}`);
    }, 500);
  }
  
  // Step 5: Test double-tap simulation
  console.log('[NAV-TEST] 🔄 Testing double-tap show/hide...');
  
  const mapContainer = document.querySelector('.maplibregl-canvas') as HTMLElement;
  if (mapContainer) {
    console.log('[NAV-TEST] Map canvas found, simulating double-tap...');
    
    // Create and dispatch touch events
    const simulateDoubleTap = () => {
      const touch = new Touch({
        identifier: 0,
        target: mapContainer,
        clientX: 200,
        clientY: 300,
        pageX: 200,
        pageY: 300,
      });
      
      // First tap
      const touchStart1 = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [touch],
        targetTouches: [touch],
        changedTouches: [touch]
      });
      const touchEnd1 = new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        touches: [],
        targetTouches: [],
        changedTouches: [touch]
      });
      
      mapContainer.dispatchEvent(touchStart1);
      mapContainer.dispatchEvent(touchEnd1);
      
      // Second tap after 150ms
      setTimeout(() => {
        const touchStart2 = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [touch],
          targetTouches: [touch],
          changedTouches: [touch]
        });
        const touchEnd2 = new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          touches: [],
          targetTouches: [],
          changedTouches: [touch]
        });
        
        mapContainer.dispatchEvent(touchStart2);
        mapContainer.dispatchEvent(touchEnd2);
        
        console.log('[NAV-TEST] ✅ Double-tap events dispatched');
        
        // Check button visibility after toggle
        setTimeout(() => {
          const btnAfter = document.querySelector('[data-testid="button-incident-outside"]');
          if (btnAfter) {
            const rect = btnAfter.getBoundingClientRect();
            console.log(`[NAV-TEST] Button after toggle: ${rect.width > 0 ? '✅ VISIBLE' : '❌ HIDDEN'}`);
          }
        }, 300);
      }, 150);
    };
    
    simulateDoubleTap();
  } else {
    console.log('[NAV-TEST] ❌ Map canvas not found');
  }
  
  console.log('='.repeat(60));
  console.log('[NAV-TEST] 🏁 Test simulation complete');
  console.log('[NAV-TEST] Check console for [INCIDENT-BTN-OUTSIDE] and [DOUBLE-TAP] logs');
  console.log('='.repeat(60));
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).testNavButtons = simulateNavButtonTest;
}
