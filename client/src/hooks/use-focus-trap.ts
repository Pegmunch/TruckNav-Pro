import { useEffect, useRef } from "react";

interface UseFocusTrapOptions {
  enabled?: boolean;
  onEscape?: () => void;
  initialFocus?: boolean;
  returnFocus?: boolean;
}

export function useFocusTrap<T extends HTMLElement = HTMLElement>(options: UseFocusTrapOptions = {}) {
  const {
    enabled = true,
    onEscape,
    initialFocus = true,
    returnFocus = true,
  } = options;

  const containerRef = useRef<T>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    const getFocusableElements = (): HTMLElement[] => {
      if (!container) return [];
      
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors))
        .filter(el => {
          return el.offsetParent !== null && 
                 !el.hasAttribute('disabled') &&
                 el.getAttribute('tabindex') !== '-1';
        });
    };

    const handleTabKey = (e: KeyboardEvent) => {
      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (onEscape) {
        onEscape();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        handleTabKey(e);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleEscapeKey(e);
      }
    };

    if (initialFocus) {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        requestAnimationFrame(() => {
          focusableElements[0].focus();
        });
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      if (returnFocus && previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [enabled, onEscape, initialFocus, returnFocus]);

  return containerRef;
}
