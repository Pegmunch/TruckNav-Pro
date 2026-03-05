export async function audioBluetoothInit(): Promise<void> {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      await ctx.resume();
    }
  } catch {}
}
