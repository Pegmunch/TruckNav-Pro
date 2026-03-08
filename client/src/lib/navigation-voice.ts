let enabled = true;
export const navigationVoice = {
  isEnabled: () => enabled,
  setEnabled: (value: boolean) => { enabled = value; },
  speak: (text: string) => { if (!enabled) return; if ("speechSynthesis" in window) { const u = new SpeechSynthesisUtterance(text); window.speechSynthesis.speak(u); } },
  stop: () => { if ("speechSynthesis" in window) { window.speechSynthesis.cancel(); } },
  announceReroute: () => { navigationVoice.speak("Rerouting."); },
  announceIncident: (label: string, dist?: number) => { navigationVoice.speak("Incident ahead: " + label); },
  announceTurn: (instruction: string, ...args: any[]) => { navigationVoice.speak(instruction); },
  forceMaxVolume: () => {},
};
