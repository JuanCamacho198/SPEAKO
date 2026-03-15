import { processPunctuation } from '../../utils/punctuation';
import { DEFAULT_PUNCTUATION_CONFIG, PunctuationConfig } from '../../utils/punctuation.config';

describe('punctuation utilities', () => {
  describe('processPunctuation', () => {
    it('should return raw text when feature is disabled', () => {
      const config: PunctuationConfig = { enabled: false, sensitivity: 'medium' };
      const input = { text: 'hello world', lang: 'en' };
      const result = processPunctuation(input, config);
      expect(result).toBe('hello world');
    });

    it('should return raw text for empty string', () => {
      const input = { text: '', lang: 'en' };
      const result = processPunctuation(input, DEFAULT_PUNCTUATION_CONFIG);
      expect(result).toBe('');
    });

    it('should return raw text for whitespace-only string', () => {
      const input = { text: '   ', lang: 'en' };
      const result = processPunctuation(input, DEFAULT_PUNCTUATION_CONFIG);
      expect(result).toBe('   ');
    });

    it('should capitalize first letter of sentence', () => {
      const input = { text: 'hello world', lang: 'en' };
      const result = processPunctuation(input, DEFAULT_PUNCTUATION_CONFIG);
      expect(result).toBe('Hello world');
    });

    it('should capitalize after period', () => {
      const input = { text: 'hello. world is good', lang: 'en' };
      const result = processPunctuation(input, DEFAULT_PUNCTUATION_CONFIG);
      expect(result).toBe('Hello. World is good');
    });

    it('should handle English interrogative words', () => {
      const input = { text: 'what is your name', lang: 'en' };
      const result = processPunctuation(input, DEFAULT_PUNCTUATION_CONFIG);
      expect(result).toBe('What is your name?');
    });

    it('should handle Spanish interrogative words', () => {
      const input = { text: 'cómo estás', lang: 'es' };
      const result = processPunctuation(input, DEFAULT_PUNCTUATION_CONFIG);
      expect(result).toBe('Cómo estás?');
    });

    it('should handle multiple English interrogative words', () => {
      const input = { text: 'where are we going', lang: 'en' };
      const result = processPunctuation(input, DEFAULT_PUNCTUATION_CONFIG);
      expect(result).toBe('Where are we going?');
    });

    it('should handle "who" interrogative', () => {
      const input = { text: 'who are you', lang: 'en' };
      const result = processPunctuation(input, DEFAULT_PUNCTUATION_CONFIG);
      expect(result).toBe('Who are you?');
    });

    it('should handle "why" interrogative', () => {
      const input = { text: 'why is this happening', lang: 'en' };
      const result = processPunctuation(input, DEFAULT_PUNCTUATION_CONFIG);
      expect(result).toBe('Why is this happening?');
    });

    it('should handle "how" interrogative', () => {
      const input = { text: 'how does this work', lang: 'en' };
      const result = processPunctuation(input, DEFAULT_PUNCTUATION_CONFIG);
      expect(result).toBe('How does this work?');
    });

    it('should not add question mark if already ends with punctuation', () => {
      const input = { text: 'what is this?', lang: 'en' };
      const result = processPunctuation(input, DEFAULT_PUNCTUATION_CONFIG);
      expect(result).toBe('What is this?');
    });

    it('should handle single word input', () => {
      const input = { text: 'hello', lang: 'en' };
      const result = processPunctuation(input, DEFAULT_PUNCTUATION_CONFIG);
      expect(result).toBe('Hello');
    });

    it('should handle Spanish es interrogative', () => {
      const input = { text: 'es tarde', lang: 'es' };
      const result = processPunctuation(input, DEFAULT_PUNCTUATION_CONFIG);
      expect(result).toBe('Es tarde?');
    });

    it('should handle "qué" Spanish interrogative', () => {
      const input = { text: 'qué hora es', lang: 'es' };
      const result = processPunctuation(input, DEFAULT_PUNCTUATION_CONFIG);
      expect(result).toBe('Qué hora es?');
    });

    it('should handle multiple sentences with proper capitalization', () => {
      const input = { text: 'hello world. goodbye world', lang: 'en' };
      const result = processPunctuation(input, DEFAULT_PUNCTUATION_CONFIG);
      expect(result).toBe('Hello world. Goodbye world');
    });

    it('should handle lowercase words after period', () => {
      const input = { text: 'hello. world', lang: 'en' };
      const result = processPunctuation(input, DEFAULT_PUNCTUATION_CONFIG);
      expect(result).toBe('Hello. World');
    });

    it('should handle error gracefully and return raw text', () => {
      const input = { text: 'test', lang: 'en' };
      const invalidConfig = { enabled: true, sensitivity: 'invalid' as any };
      const result = processPunctuation(input, invalidConfig);
      expect(result).toBe('test');
    });
  });
});
