import { SpeechEngine, RecognitionOptions, TranscriptResult } from '../../components/SpeechEngine';
import { LanguageDetectionConfig, DEFAULT_LANGUAGE_DETECTION_CONFIG } from '../../utils/language-detection.config';
import { PunctuationConfig, DEFAULT_PUNCTUATION_CONFIG } from '../../utils/punctuation.config';
import { VocabularyStore } from '../../utils/custom-vocabulary.config';

const mockSpeechRecognition = {
  lang: '',
  continuous: false,
  interimResults: false,
  maxAlternatives: 1,
  onresult: null as ((event: any) => void) | null,
  onerror: null as ((event: any) => void) | null,
  onend: null as (() => void) | null,
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
};

class MockSpeechRecognition {
  constructor() {
    return mockSpeechRecognition;
  }
}

(global as any).SpeechRecognition = MockSpeechRecognition;
(global as any).webkitSpeechRecognition = MockSpeechRecognition;

describe('SpeechEngine Integration: Language Detection + Punctuation', () => {
  let engine: SpeechEngine;
  let onFinalResult: TranscriptResult | null;
  let onInterimMock: jest.Mock;
  let onFinalMock: jest.Mock;
  let onErrorMock: jest.Mock;
  let onEndMock: jest.Mock;

  const createEngine = (
    langDetectionEnabled: boolean,
    punctuationEnabled: boolean,
    vocabularyEnabled: boolean = false
  ) => {
    const options: RecognitionOptions = {
      lang: 'es',
      continuous: false,
      interimResults: true,
      silenceTimeoutMs: 5000,
      punctuation: { ...DEFAULT_PUNCTUATION_CONFIG, enabled: punctuationEnabled },
      languageDetection: {
        enabled: langDetectionEnabled,
        config: { ...DEFAULT_LANGUAGE_DETECTION_CONFIG, defaultLang: 'es' },
      },
      vocabulary: {
        enabled: vocabularyEnabled,
      },
    };

    const callbacks = {
      onInterim: onInterimMock,
      onFinal: onFinalMock,
      onError: onErrorMock,
      onEnd: onEndMock,
    };

    return new SpeechEngine(options, callbacks);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    onInterimMock = jest.fn();
    onFinalMock = jest.fn();
    onErrorMock = jest.fn();
    onEndMock = jest.fn();
    onFinalResult = null;

    onFinalMock.mockImplementation((result: TranscriptResult) => {
      onFinalResult = result;
    });
  });

  const simulateRecognition = (transcript: string) => {
    if (!mockSpeechRecognition.onresult) return;
    
    const event = {
      resultIndex: 0,
      results: [
        {
          isFinal: true,
          0: { transcript, confidence: 0.9 },
        },
      ],
    };
    
    mockSpeechRecognition.onresult(event as any);
  };

  describe('Language Detection → Punctuation flow', () => {
    it('should detect language and apply punctuation together', () => {
      engine = createEngine(true, true);
      engine.start();
      
      simulateRecognition('hola mundo');
      
      expect(onFinalMock).toHaveBeenCalled();
      expect(onFinalResult).toBeDefined();
      expect(onFinalResult!.text).toBe('Hola mundo');
      expect(onFinalResult!.language).toBeDefined();
    });

    it('should use detected language for punctuation', () => {
      engine = createEngine(true, true);
      engine.start();
      
      simulateRecognition('como estas');
      
      expect(onFinalResult!.text).toMatch(/[?]/);
    });

    it('should return language metadata when detection enabled', () => {
      engine = createEngine(true, false);
      engine.start();
      
      simulateRecognition('hello world');
      
      expect(onFinalResult!.language).toBeDefined();
      expect(onFinalResult!.confidence).toBeDefined();
    });

    it('should skip language detection when disabled', () => {
      engine = createEngine(false, false);
      engine.start();
      
      simulateRecognition('hello world');
      
      expect(onFinalResult!.language).toBeUndefined();
    });

    it('should detect code-switching', () => {
      engine = createEngine(true, false);
      engine.start();
      
      simulateRecognition('hello mundo today es good');
      
      expect(onFinalResult!.isCodeSwitched).toBe(true);
    });

    it('should apply punctuation to code-switched text', () => {
      engine = createEngine(true, true);
      engine.start();
      
      simulateRecognition('como estas hello world');
      
      expect(onFinalResult!.text).toBeDefined();
      expect(onFinalResult!.text).toMatch(/[.!?]/);
    });
  });

  describe('Punctuation without language detection', () => {
    it('should apply punctuation using default lang when detection disabled', () => {
      engine = createEngine(false, true);
      engine.start();
      
      simulateRecognition('como estas');
      
      expect(onFinalResult!.text).toMatch(/[?]/);
    });

    it('should return text without punctuation when disabled', () => {
      engine = createEngine(false, false);
      engine.start();
      
      simulateRecognition('hello world');
      
      expect(onFinalResult!.text).toBe('hello world');
    });
  });

  describe('TranscriptResult structure', () => {
    it('should include all expected fields', () => {
      engine = createEngine(true, true);
      engine.start();
      
      simulateRecognition('test');
      
      expect(onFinalResult).toMatchObject({
        text: expect.any(String),
        language: expect.any(String),
        confidence: expect.any(Number),
        isCodeSwitched: expect.any(Boolean),
      });
    });

    it('should include vocabularyBoost when vocabulary enabled', () => {
      engine = createEngine(true, false, true);
      engine.start();
      
      simulateRecognition('test');
      
      expect(onFinalResult).toHaveProperty('vocabularyBoost');
    });
  });
});
