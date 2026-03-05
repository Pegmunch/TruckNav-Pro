export function hapticButtonPress(style: "light" | "medium" | "heavy" = "light"): void {
  if ("vibrate" in navigator) {
    const duration = style === "light" ? 10 : style === "medium" ? 20 : 40;
    navigator.vibrate(duration);
  }
}
export function useHapticFeedback() {
  return {
    light: () => hapticButtonPress("light"),
    medium: () => hapticButtonPress("medium"),
    heavy: () => hapticButtonPress("heavy"),
  };
}
