// Web Speech API — SpeechRecognition (Speech-to-Text)
// Works in Chromium-based WebViews (Tauri uses WebView2 on Windows).

export interface RecognitionOptions {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
}

export interface RecognitionCallbacks {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

type SpeechRecognitionCtor = typeof SpeechRecognition;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSTTSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export class SpeechEngine {
  private recognition: SpeechRecognition | null = null;
  private options: RecognitionOptions;
  private callbacks: RecognitionCallbacks;
  private running = false;

  constructor(options: RecognitionOptions, callbacks: RecognitionCallbacks) {
    this.options = options;
    this.callbacks = callbacks;
  }

  start() {
    if (this.running) return;

    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      this.callbacks.onError("SpeechRecognition no está disponible en este entorno.");
      return;
    }

    const rec = new Ctor();
    rec.lang = this.options.lang;
    rec.continuous = this.options.continuous;
    rec.interimResults = this.options.interimResults;
    rec.maxAlternatives = 1;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (interim) this.callbacks.onInterim(interim);
      if (finalText) this.callbacks.onFinal(finalText);
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      const msg =
        event.error === "not-allowed"
          ? "Permiso de micrófono denegado."
          : event.error === "no-speech"
          ? "No se detectó voz."
          : `Error: ${event.error}`;
      this.callbacks.onError(msg);
      this.running = false;
    };

    rec.onend = () => {
      this.running = false;
      this.callbacks.onEnd();
    };

    this.recognition = rec;
    this.running = true;
    rec.start();
  }

  stop() {
    if (this.recognition && this.running) {
      this.recognition.stop();
    }
  }

  abort() {
    if (this.recognition) {
      this.recognition.abort();
      this.running = false;
    }
  }

  isRunning() {
    return this.running;
  }

  updateOptions(options: Partial<RecognitionOptions>) {
    this.options = { ...this.options, ...options };
  }
}
