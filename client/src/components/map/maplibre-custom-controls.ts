import type { Map, IControl } from 'maplibre-gl';

interface CustomControlOptions {
  onClick: () => void;
  icon: string;
  borderColor: string;
  title: string;
  testId: string;
}

class CustomButtonControl implements IControl {
  private container: HTMLDivElement | null = null;
  private button: HTMLButtonElement | null = null;
  private options: CustomControlOptions;
  private map: Map | null = null;

  constructor(options: CustomControlOptions) {
    this.options = options;
  }

  onAdd(map: Map): HTMLElement {
    this.map = map;
    
    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    this.container.style.cssText = 'pointer-events: auto !important;';
    
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'maplibre-custom-control-btn';
    this.button.setAttribute('data-testid', this.options.testId);
    this.button.title = this.options.title;
    this.button.innerHTML = this.options.icon;
    
    this.button.style.cssText = `
      width: 36px;
      height: 36px;
      min-width: 36px;
      min-height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      border: 2px solid ${this.options.borderColor};
      border-radius: 12px;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      pointer-events: auto !important;
      user-select: none;
      -webkit-user-select: none;
    `;
    
    let lastFiredAt = 0;
    const handleInteraction = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      
      const now = Date.now();
      if (now - lastFiredAt < 500) return;
      lastFiredAt = now;
      
      console.log(`[MAPLIBRE-CONTROL] ${this.options.testId} fired via ${e.type}`);
      
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
      
      this.options.onClick();
    };
    
    this.button.addEventListener('touchstart', handleInteraction, { passive: false, capture: true });
    this.button.addEventListener('click', (e: Event) => {
      if (Date.now() - lastFiredAt < 500) {
        e.preventDefault();
        return;
      }
      handleInteraction(e);
    }, { capture: true });
    
    this.container.appendChild(this.button);
    
    return this.container;
  }

  onRemove(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.button = null;
    this.map = null;
  }

  updateBorderColor(color: string): void {
    if (this.button) {
      this.button.style.borderColor = color;
    }
  }

  updateIcon(icon: string): void {
    if (this.button) {
      this.button.innerHTML = icon;
    }
  }
}

const ICON_ALERT_CIRCLE = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

const ICON_LAYERS = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`;

const ICON_BOX = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`;

export class IncidentControl extends CustomButtonControl {
  constructor(onClick: () => void) {
    super({
      onClick,
      icon: ICON_ALERT_CIRCLE,
      borderColor: '#ef4444',
      title: 'View Incidents',
      testId: 'maplibre-incident-control'
    });
  }
}

export class TrafficControl extends CustomButtonControl {
  private isActive: boolean = false;

  constructor(onClick: () => void, isActive: boolean = false) {
    super({
      onClick,
      icon: ICON_LAYERS,
      borderColor: isActive ? '#f97316' : '#9ca3af',
      title: 'Toggle Traffic',
      testId: 'maplibre-traffic-control'
    });
    this.isActive = isActive;
  }

  setActive(active: boolean): void {
    this.isActive = active;
    this.updateBorderColor(active ? '#f97316' : '#9ca3af');
  }
}

export class TiltControl extends CustomButtonControl {
  private isActive: boolean = false;

  constructor(onClick: () => void, isActive: boolean = false) {
    super({
      onClick,
      icon: ICON_BOX,
      borderColor: isActive ? '#3b82f6' : '#9ca3af',
      title: 'Toggle 3D View',
      testId: 'maplibre-tilt-control'
    });
    this.isActive = isActive;
  }

  setActive(active: boolean): void {
    this.isActive = active;
    this.updateBorderColor(active ? '#3b82f6' : '#9ca3af');
  }
}

export type { CustomButtonControl };
