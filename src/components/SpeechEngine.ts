import { PunctuationConfig, DEFAULT_PUNCTUATION_CONFIG } from '../utils/punctuation.config';
import { processPunctuation } from '../utils/punctuation';
import { LanguageDetectionConfig, DEFAULT_LANGUAGE_DETECTION_CONFIG } from '../utils/language-detection.config';
import { detectLanguage } from '../utils/language-detection';
import { getVocabularyBoost } from '../utils/vocabulary-storage';
import { VocabularyStore } from '../utils/custom-vocabulary.config';
import { LanguageSegment } from '../types/language-detection.types';

export interface LanguageDetectionOptions {
  enabled: boolean;
  config?: LanguageDetectionConfig;
}

export interface VocabularyOptions {
  enabled: boolean;
  store?: VocabularyStore;
}

// Web Speech API — SpeechRecognition (Speech-to-Text)
// Works in Chromium-based WebViews (Tauri uses WebView2 on Windows).

export interface RecognitionOptions {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  silenceTimeoutMs?: number;
  punctuation?: PunctuationConfig;
  languageDetection?: LanguageDetectionOptions;
  vocabulary?: VocabularyOptions;
  bufferingEnabled?: boolean;
}

export interface TranscriptResult {
  text: string;
  language?: string;
  confidence?: number;
  isCodeSwitched?: boolean;
  segments?: LanguageSegment[];
  vocabularyBoost?: number;
}

export interface RecognitionCallbacks {
  onInterim: (text: string) => void;
  onFinal: (result: TranscriptResult) => void;
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
  private silenceTimer: number | null = null;
  private punctuationConfig: PunctuationConfig;
  private languageDetectionConfig: LanguageDetectionConfig;
  private languageDetectionEnabled: boolean;
  private vocabularyEnabled: boolean;
  private vocabularyStore: VocabularyStore | null = null;
  private buffer: string[] = [];
  private bufferingEnabled: boolean = false;
  private silenceTimeoutMs: number = 3000;

  constructor(options: RecognitionOptions, callbacks: RecognitionCallbacks) {
    this.options = options;
    this.callbacks = callbacks;
    this.punctuationConfig = options.punctuation ?? DEFAULT_PUNCTUATION_CONFIG;
    this.languageDetectionConfig = options.languageDetection?.config ?? DEFAULT_LANGUAGE_DETECTION_CONFIG;
    this.languageDetectionEnabled = options.languageDetection?.enabled ?? false;
    this.vocabularyEnabled = options.vocabulary?.enabled ?? false;
    this.bufferingEnabled = options.bufferingEnabled ?? false;
    this.silenceTimeoutMs = options.silenceTimeoutMs ?? 3000;
    
    if (this.vocabularyEnabled && options.vocabulary?.store) {
      this.vocabularyStore = options.vocabulary.store;
    }

    if (this.bufferingEnabled) {
      this.buffer = [];
    }
  }

  private clearSilenceTimer() {
    if (this.silenceTimer !== null) {
      window.clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private resetSilenceTimer() {
    this.clearSilenceTimer();
    this.silenceTimer = window.setTimeout(() => {
      if (this.bufferingEnabled) {
        this.processBuffer();
      }
      this.stop();
    }, this.silenceTimeoutMs);
  }

  private processBuffer() {
    if (this.buffer.length === 0) return;

    const fullText = this.buffer.join(' ');
    this.buffer = [];

    const detectionLang = this.languageDetectionConfig.defaultLang;
    let detectedLanguage: string = detectionLang;
    let confidence = 0.5;
    let isCodeSwitched = false;
    let segments: LanguageSegment[] = [];

    if (this.languageDetectionEnabled) {
      const detectionResult = detectLanguage(fullText, this.languageDetectionConfig);
      detectedLanguage = detectionResult.language;
      confidence = detectionResult.confidence;
      isCodeSwitched = detectionResult.isCodeSwitched;
      segments = detectionResult.segments;
    }

    let processedText = fullText;
    if (this.punctuationConfig.enabled) {
      try {
        processedText = processPunctuation(
          { text: fullText, lang: detectedLanguage, confidence },
          this.punctuationConfig
        );
      } catch {
        processedText = fullText;
      }
    }

    let vocabularyBoost = 0;
    if (this.vocabularyEnabled && this.vocabularyStore && (detectedLanguage === 'en' || detectedLanguage === 'es')) {
      vocabularyBoost = getVocabularyBoost(fullText, detectedLanguage, this.vocabularyStore);
    }

    const result: TranscriptResult = {
      text: processedText,
      language: detectedLanguage,
      confidence,
      isCodeSwitched,
      segments,
      vocabularyBoost,
    };

    this.callbacks.onFinal(result);
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
      this.resetSilenceTimer();
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

      if (this.bufferingEnabled) {
        if (finalText) {
          this.buffer.push(finalText.trim());
        }
      } else {
        if (interim) this.callbacks.onInterim(interim);
        if (finalText) {
          let punctuatedText = finalText;
          const detectionLang = this.languageDetectionConfig.defaultLang;
          
          let detectedLanguage: string = detectionLang;
          let confidence = 0.5;
          let isCodeSwitched = false;
          let segments: LanguageSegment[] = [];
          
          if (this.languageDetectionEnabled) {
            const detectionResult = detectLanguage(finalText, this.languageDetectionConfig);
            detectedLanguage = detectionResult.language;
            confidence = detectionResult.confidence;
            isCodeSwitched = detectionResult.isCodeSwitched;
            segments = detectionResult.segments;
          }
          
          if (this.punctuationConfig.enabled) {
            try {
              punctuatedText = processPunctuation(
                { text: finalText, lang: detectedLanguage, confidence },
                this.punctuationConfig
              );
            } catch {
              punctuatedText = finalText;
            }
          }
          
          let vocabularyBoost = 0;
          if (this.vocabularyEnabled && this.vocabularyStore && (detectedLanguage === 'en' || detectedLanguage === 'es')) {
            vocabularyBoost = getVocabularyBoost(finalText, detectedLanguage, this.vocabularyStore);
          }
          
          const result: TranscriptResult = {
            text: punctuatedText,
            language: detectedLanguage,
            confidence,
            isCodeSwitched,
            segments,
            vocabularyBoost,
          };
          
          this.callbacks.onFinal(result);
        }
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.clearSilenceTimer();

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
      this.clearSilenceTimer();
      if (this.bufferingEnabled && this.buffer.length > 0) {
        this.processBuffer();
      }
      this.running = false;
      this.callbacks.onEnd();
    };

    this.recognition = rec;
    this.running = true;
    rec.start();
    this.resetSilenceTimer();
  }

  stop() {
    this.clearSilenceTimer();
    if (this.recognition && this.running) {
      this.recognition.stop();
    }
  }

  abort() {
    this.clearSilenceTimer();
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
