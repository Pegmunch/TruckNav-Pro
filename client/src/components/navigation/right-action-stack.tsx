import React from "react";
type ButtonHandler = () => void;
interface ButtonRegistration {
  callback: ButtonHandler;
  getRect: () => DOMRect | null;
  lastFired?: number;
}
export const buttonRegistry = new Map<string, ButtonRegistration>();
export function globalDebounce(fn: () => void, delay: number): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}
export function attachWindowTouchListener(handler: EventListener): void {
  window.addEventListener("touchstart", handler, { passive: true });
}
export function detachWindowTouchListener(handler: EventListener): void {
  window.removeEventListener("touchstart", handler);
}
export function RightActionStack() { return <div />; }
