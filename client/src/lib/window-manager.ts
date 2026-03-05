export function getWindowDimensions() {
  return { width: window.innerWidth, height: window.innerHeight };
}
export function isFullscreen() {
  return !!document.fullscreenElement;
}
export function requestFullscreen() {
  document.documentElement.requestFullscreen?.();
}
export function exitFullscreen() {
  document.exitFullscreen?.();
}
export function isMapWindowOpen(): boolean {
  return true;
}
export function focusMapWindow(): void {
  window.focus();
}
export function openMapWindow(): Window | null {
  return null;
}
export function closeMapWindow(): void {}
