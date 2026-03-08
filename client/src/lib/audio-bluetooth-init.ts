let audioContext: AudioContext | null = null;

async function initContext(): Promise<AudioContext | null> {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (AC && !audioContext) {
      audioContext = new AC();
      await audioContext.resume();
    }
    return audioContext;
  } catch {
    return null;
  }
}

export const audioBluetoothInit = {
  init: initContext,
  getAudioContext: () => audioContext,
  startPersistentSession: async () => { await initContext(); },
  stopPersistentSession: () => { 
    if (audioContext) { audioContext.close().catch(() => {}); audioContext = null; }
  },
  startNavigationKeepAlive: () => {},
  stopNavigationKeepAlive: () => {},
  keepBluetoothAlive: async () => {},
  reinitialize: async () => { 
    if (audioContext) { audioContext.close().catch(() => {}); audioContext = null; }
    await initContext();
  },
  primeSpeechFromGesture: () => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
  },
  activateBluetoothForSpeech: async () => { await initContext(); },
};

export default audioBluetoothInit;
