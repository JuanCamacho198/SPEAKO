import { detectLanguage, detectSegments, getLanguageLabel } from '../../utils/language-detection';
import { LanguageDetectionConfig, DEFAULT_LANGUAGE_DETECTION_CONFIG } from '../../utils/language-detection.config';

describe('language-detection utilities', () => {
  describe('detectLanguage', () => {
    it('should return default language when disabled', () => {
      const config: LanguageDetectionConfig = { ...DEFAULT_LANGUAGE_DETECTION_CONFIG, enabled: false };
      const result = detectLanguage('hello world', config);
      expect(result.language).toBe('es');
      expect(result.segments).toHaveLength(0);
      expect(result.isCodeSwitched).toBe(false);
    });

    it('should return default language for empty text', () => {
      const result = detectLanguage('');
      expect(result.language).toBe('es');
      expect(result.confidence).toBe(0.5);
    });

    it('should detect English text', () => {
      const result = detectLanguage('hello world today is a good day');
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Spanish text', () => {
      const result = detectLanguage('hola mundo hoy es un buen dia');
      expect(result.language).toBe('es');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect code-switching between English and Spanish', () => {
      const result = detectLanguage('hello mundo today es good muy bien');
      expect(result.isCodeSwitched).toBe(true);
      expect(result.segments.length).toBeGreaterThan(1);
    });

    it('should use custom default language', () => {
      const config: LanguageDetectionConfig = { ...DEFAULT_LANGUAGE_DETECTION_CONFIG, defaultLang: 'en' };
      const result = detectLanguage('xyz abc', config);
      expect(result.language).toBe('en');
    });
  });

  describe('detectSegments', () => {
    it('should return empty array for empty text', () => {
      const result = detectSegments('');
      expect(result).toHaveLength(0);
    });

    it('should return empty array for whitespace-only text', () => {
      const result = detectSegments('   ');
      expect(result).toHaveLength(0);
    });

    it('should segment English text', () => {
      const result = detectSegments('hello world');
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].lang).toBe('en');
    });

    it('should segment Spanish text', () => {
      const result = detectSegments('hola mundo');
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].lang).toBe('es');
    });

    it('should filter segments by minimum confidence', () => {
      const result = detectSegments('hello', 0.9);
      expect(result.every(s => s.confidence >= 0.9)).toBe(true);
    });
  });

  describe('getLanguageLabel', () => {
    it('should return English for en', () => {
      expect(getLanguageLabel('en')).toBe('English');
    });

    it('should return Español for es', () => {
      expect(getLanguageLabel('es')).toBe('Español');
    });

    it('should return Unknown for und', () => {
      expect(getLanguageLabel('und')).toBe('Unknown');
    });

    it('should return uppercase code for unknown languages', () => {
      expect(getLanguageLabel('fr')).toBe('FR');
    });
  });
});
