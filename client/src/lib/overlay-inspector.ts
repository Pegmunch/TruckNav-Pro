/**
 * Overlay Inspector - Debug utility to identify blocking elements
 * This tool scans for fixed-position elements that may intercept map clicks
 */

export interface OverlayInfo {
  selector: string;
  element: HTMLElement;
  zIndex: number;
  position: string;
  opacity: number;
  background: string;
  backdropFilter: string;
  pointerEvents: string;
  bounds: DOMRect;
  coversViewport: boolean;
}

export class OverlayInspector {
  private originalStyles = new Map<HTMLElement, any>();
  private isInspecting = false;

  /**
   * Scan for all potential overlay elements that could block interaction
   */
  scanOverlays(): OverlayInfo[] {
    const overlays: OverlayInfo[] = [];
    const elements = Array.from(document.querySelectorAll('*')) as HTMLElement[];
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    for (const element of elements) {
      const computed = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      
      // Check if element is fixed position and covers significant viewport area
      if (computed.position === 'fixed') {
        const coversViewport = (
          bounds.width >= viewportWidth * 0.9 && 
          bounds.height >= viewportHeight * 0.9
        ) || (
          bounds.left <= 0 && 
          bounds.top <= 0 && 
          bounds.right >= viewportWidth && 
          bounds.bottom >= viewportHeight
        );
        
        const zIndex = computed.zIndex === 'auto' ? 0 : parseInt(computed.zIndex, 10);
        
        // Focus on elements that could intercept clicks
        if (zIndex > 0 || computed.pointerEvents !== 'none' || coversViewport) {
          overlays.push({
            selector: this.getSelector(element),
            element,
            zIndex,
            position: computed.position,
            opacity: parseFloat(computed.opacity),
            background: computed.background,
            backdropFilter: computed.backdropFilter,
            pointerEvents: computed.pointerEvents,
            bounds,
            coversViewport
          });
        }
      }
    }
    
    // Sort by z-index descending (topmost first)
    return overlays.sort((a, b) => b.zIndex - a.zIndex);
  }

  /**
   * Generate a CSS selector for an element
   */
  private getSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className) {
      const classes = Array.from(element.classList)
        .filter(cls => cls && !cls.match(/^[0-9]/))
        .slice(0, 3)
        .join('.');
      if (classes) {
        return `${element.tagName.toLowerCase()}.${classes}`;
      }
    }
    
    if (element.hasAttribute('data-testid')) {
      return `[data-testid="${element.getAttribute('data-testid')}"]`;
    }
    
    return element.tagName.toLowerCase();
  }

  /**
   * Test what element is actually at the click point
   */
  testClickPoint(x: number, y: number): HTMLElement | null {
    return document.elementFromPoint(x, y) as HTMLElement;
  }

  /**
   * Sample multiple points across the map area to find interceptors
   */
  sampleMapInterception(mapSelector = '.maplibregl-canvas'): any[] {
    const mapElement = document.querySelector(mapSelector) as HTMLElement;
    if (!mapElement) return [];
    
    const mapBounds = mapElement.getBoundingClientRect();
    const samples = [];
    
    // Sample a grid of points across the map
    for (let x = mapBounds.left + 50; x < mapBounds.right - 50; x += 100) {
      for (let y = mapBounds.top + 50; y < mapBounds.bottom - 50; y += 100) {
        const topElement = this.testClickPoint(x, y);
        if (topElement && topElement !== mapElement) {
          samples.push({
            point: { x, y },
            interceptor: this.getSelector(topElement),
            element: topElement
          });
        }
      }
    }
    
    return samples;
  }

  /**
   * Highlight overlays visually for debugging
   */
  highlightOverlays(overlays: OverlayInfo[]) {
    overlays.forEach((overlay, index) => {
      const element = overlay.element;
      const originalOutline = element.style.outline;
      
      // Store original style
      if (!this.originalStyles.has(element)) {
        this.originalStyles.set(element, { outline: originalOutline });
      }
      
      // Apply debug highlight
      element.style.outline = `3px solid ${this.getDebugColor(index)}`;
      element.style.outlineOffset = '2px';
    });
  }

  /**
   * Temporarily neutralize suspected overlays for testing
   */
  neutralizeOverlays(overlays: OverlayInfo[]) {
    overlays.forEach(overlay => {
      const element = overlay.element;
      
      // Store original styles if not already stored
      if (!this.originalStyles.has(element)) {
        this.originalStyles.set(element, {
          pointerEvents: element.style.pointerEvents,
          background: element.style.background,
          backdropFilter: element.style.backdropFilter
        });
      }
      
      // Neutralize
      element.style.pointerEvents = 'none';
      element.style.background = 'transparent';
      element.style.backdropFilter = 'none';
    });
  }

  /**
   * Restore original styles
   */
  restoreStyles() {
    this.originalStyles.forEach((styles, element) => {
      Object.assign(element.style, styles);
    });
    this.originalStyles.clear();
  }

  /**
   * Get debug color for highlighting
   */
  private getDebugColor(index: number): string {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    return colors[index % colors.length];
  }

  /**
   * Full diagnostic report
   */
  generateReport(): string {
    console.log('🔍 OVERLAY INSPECTOR: Starting scan...');
    
    const overlays = this.scanOverlays();
    const mapInterception = this.sampleMapInterception();
    
    console.log('📊 OVERLAY ANALYSIS');
    console.table(overlays.map(o => ({
      Selector: o.selector,
      'Z-Index': o.zIndex,
      'Pointer Events': o.pointerEvents,
      'Covers Viewport': o.coversViewport,
      Background: o.background.slice(0, 50),
      'Backdrop Filter': o.backdropFilter
    })));
    
    if (mapInterception.length > 0) {
      console.log('🎯 MAP INTERCEPTION DETECTED:');
      console.table(mapInterception);
    }
    
    // Highlight suspicious overlays
    const suspicious = overlays.filter(o => 
      o.coversViewport && 
      o.pointerEvents !== 'none' && 
      (o.zIndex > 40 || o.background !== 'rgba(0, 0, 0, 0)')
    );
    
    if (suspicious.length > 0) {
      console.log('⚠️  SUSPICIOUS OVERLAYS (likely culprits):');
      console.table(suspicious.map(o => ({
        Selector: o.selector,
        'Z-Index': o.zIndex,
        Background: o.background
      })));
      
      this.highlightOverlays(suspicious);
    }
    
    return `Found ${overlays.length} overlays, ${suspicious.length} suspicious, ${mapInterception.length} intercepting map clicks`;
  }
}

// Global debug utilities
declare global {
  interface Window {
    __OVERLAY_INSPECTOR: OverlayInspector;
    __OVERLAY_SAFE_MODE: boolean;
  }
}

// Initialize global inspector
if (typeof window !== 'undefined') {
  window.__OVERLAY_INSPECTOR = new OverlayInspector();
  window.__OVERLAY_SAFE_MODE = true; // Enable safe mode by default
}

export const overlayInspector = typeof window !== 'undefined' ? window.__OVERLAY_INSPECTOR : null;