export interface SpeechOptions {
  rate: number;
  pitch: number;
  volume: number;
  voiceURI: string;
}

export function getVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

export function speak(text: string, options: SpeechOptions): void {
  if (!text.trim()) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate;
  utterance.pitch = options.pitch;
  utterance.volume = options.volume;

  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((v) => v.voiceURI === options.voiceURI);
  if (voice) utterance.voice = voice;

  window.speechSynthesis.speak(utterance);
}

export function stop(): void {
  window.speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  return window.speechSynthesis.speaking;
}
