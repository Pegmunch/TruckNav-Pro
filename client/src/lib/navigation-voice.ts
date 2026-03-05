export const navigationVoice = {
  speak: (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  },
  stop: () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  },
};
