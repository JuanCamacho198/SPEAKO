import { processPunctuation } from '../../utils/punctuation';
import { LanguageDetectionConfig, DEFAULT_LANGUAGE_DETECTION_CONFIG } from '../../utils/language-detection.config';
import { detectLanguage } from '../../utils/language-detection';
import { getVocabularyBoost } from '../../utils/vocabulary-storage';
import { VocabularyStore } from '../../types/custom-vocabulary.types';

describe('SpeechEngine Integration: Language Detection → Punctuation', () => {
  const defaultLangConfig: LanguageDetectionConfig = {
    ...DEFAULT_LANGUAGE_DETECTION_CONFIG,
    defaultLang: 'es',
  };

  describe('Full pipeline: Language Detection → Punctuation', () => {
    it('should detect language and apply punctuation together', () => {
      const text = 'hola mundo';
      const detectionResult = detectLanguage(text, defaultLangConfig);
      
      const punctuatedText = processPunctuation(
        { text, lang: detectionResult.language, confidence: detectionResult.confidence },
        { enabled: true, sensitivity: 'medium' }
      );
      
      expect(punctuatedText).toBe('Hola mundo');
      expect(detectionResult.language).toBeDefined();
    });

    it('should use detected Spanish language for punctuation', () => {
      const text = 'como estas';
      const detectionResult = detectLanguage(text, defaultLangConfig);
      
      const punctuatedText = processPunctuation(
        { text, lang: detectionResult.language, confidence: detectionResult.confidence },
        { enabled: true, sensitivity: 'medium' }
      );
      
      expect(punctuatedText).toMatch(/[?]/);
    });

    it('should use detected English language for punctuation', () => {
      const config: LanguageDetectionConfig = { ...defaultLangConfig, defaultLang: 'en' };
      const text = 'what is your name';
      const detectionResult = detectLanguage(text, config);
      
      const punctuatedText = processPunctuation(
        { text, lang: detectionResult.language, confidence: detectionResult.confidence },
        { enabled: true, sensitivity: 'medium' }
      );
      
      expect(detectionResult.language).toBe('en');
      expect(punctuatedText).toMatch(/[?]/);
    });

    it('should handle code-switched text with punctuation', () => {
      const text = 'hello mundo today es good';
      const detectionResult = detectLanguage(text, defaultLangConfig);
      
      expect(detectionResult.isCodeSwitched).toBe(true);
      
      const punctuatedText = processPunctuation(
        { text, lang: detectionResult.language, confidence: detectionResult.confidence },
        { enabled: true, sensitivity: 'medium' }
      );
      
      expect(punctuatedText).toBeDefined();
    });

    it('should skip language detection when disabled', () => {
      const config: LanguageDetectionConfig = { ...defaultLangConfig, enabled: false };
      const text = 'hello world';
      
      const detectionResult = detectLanguage(text, config);
      
      expect(detectionResult.language).toBe('es');
      expect(detectionResult.segments).toHaveLength(0);
    });

    it('should apply punctuation with default language when detection disabled', () => {
      const config: LanguageDetectionConfig = { ...defaultLangConfig, enabled: false };
      const text = 'como estas';
      
      const detectionResult = detectLanguage(text, config);
      
      const punctuatedText = processPunctuation(
        { text, lang: detectionResult.language, confidence: detectionResult.confidence },
        { enabled: true, sensitivity: 'medium' }
      );
      
      expect(punctuatedText).toMatch(/[?]/);
    });
  });

  describe('Language metadata', () => {
    it('should return language metadata when detection enabled', () => {
      const text = 'hello world';
      const result = detectLanguage(text, defaultLangConfig);
      
      expect(result.language).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.isCodeSwitched).toBeDefined();
    });

    it('should detect code-switching', () => {
      const text = 'hello mundo today es good muy bien';
      const result = detectLanguage(text, defaultLangConfig);
      
      expect(result.isCodeSwitched).toBe(true);
      expect(result.segments.length).toBeGreaterThan(1);
    });

    it('should provide segment information', () => {
      const text = 'hello world';
      const result = detectLanguage(text, defaultLangConfig);
      
      expect(result.segments).toBeDefined();
      expect(Array.isArray(result.segments)).toBe(true);
    });
  });

  describe('TranscriptResult simulation', () => {
    it('should produce complete result structure', () => {
      const text = 'test sentence';
      const detectionResult = detectLanguage(text, defaultLangConfig);
      const punctuatedText = processPunctuation(
        { text, lang: detectionResult.language, confidence: detectionResult.confidence },
        { enabled: true, sensitivity: 'medium' }
      );
      
      const mockVocabularyStore: VocabularyStore = {
        version: 1,
        entries: [
          {
            id: '1',
            text: 'test',
            frequency: 5,
            language: 'en',
            createdAt: '2024-01-01',
            lastUsed: '2024-01-01'
          }
        ]
      };
      const vocabularyBoost = getVocabularyBoost(text, detectionResult.language as 'en' | 'es', mockVocabularyStore);
      
      const result = {
        text: punctuatedText,
        language: detectionResult.language,
        confidence: detectionResult.confidence,
        isCodeSwitched: detectionResult.isCodeSwitched,
        segments: detectionResult.segments,
        vocabularyBoost,
      };
      
      expect(result.text).toBeDefined();
      expect(result.language).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.isCodeSwitched).toBeDefined();
      expect(result.segments).toBeDefined();
      expect(result.vocabularyBoost).toBeDefined();
    });

    it('should include vocabularyBoost when vocabulary provided', () => {
      const text = 'speako is great';
      const store: VocabularyStore = {
        version: 1,
        entries: [
          {
            id: '1',
            text: 'speako',
            frequency: 10,
            language: 'en',
            createdAt: '2024-01-01',
            lastUsed: '2024-01-01'
          }
        ]
      };
      
      const boost = getVocabularyBoost(text, 'en', store);
      expect(boost).toBeGreaterThan(0);
    });
  });
});
