import { getVocabularyBoost, findVocabularyMatches } from '../../utils/vocabulary-storage';
import { VocabularyStore } from '../../types/custom-vocabulary.types';

describe('vocabulary-storage utilities', () => {
  describe('getVocabularyBoost', () => {
    it('should return 0 for non-existent word', () => {
      const store: VocabularyStore = { version: 1, entries: [] };
      const boost = getVocabularyBoost('hello', 'en', store);
      expect(boost).toBe(0);
    });

    it('should return boost based on frequency', () => {
      const store: VocabularyStore = {
        version: 1,
        entries: [
          {
            id: '1',
            text: 'hello',
            frequency: 10,
            language: 'en',
            createdAt: '2024-01-01',
            lastUsed: '2024-01-01'
          },
          {
            id: '2',
            text: 'world',
            frequency: 5,
            language: 'en',
            createdAt: '2024-01-01',
            lastUsed: '2024-01-01'
          }
        ]
      };
      
      const boost = getVocabularyBoost('hello', 'en', store);
      expect(boost).toBe(1); // 10/10 = 1
    });

    it('should be case insensitive', () => {
      const store: VocabularyStore = {
        version: 1,
        entries: [
          {
            id: '1',
            text: 'HELLO',
            frequency: 10,
            language: 'en',
            createdAt: '2024-01-01',
            lastUsed: '2024-01-01'
          }
        ]
      };
      
      const boost = getVocabularyBoost('hello', 'en', store);
      expect(boost).toBe(1);
    });

    it('should return partial boost for lower frequency words', () => {
      const store: VocabularyStore = {
        version: 1,
        entries: [
          {
            id: '1',
            text: 'hello',
            frequency: 5,
            language: 'en',
            createdAt: '2024-01-01',
            lastUsed: '2024-01-01'
          },
          {
            id: '2',
            text: 'world',
            frequency: 10,
            language: 'en',
            createdAt: '2024-01-01',
            lastUsed: '2024-01-01'
          }
        ]
      };
      
      const boost = getVocabularyBoost('hello', 'en', store);
      expect(boost).toBe(0.5); // 5/10 = 0.5
    });
  });

  describe('findVocabularyMatches', () => {
    it('should find matching vocabulary entries', () => {
      const store: VocabularyStore = {
        version: 1,
        entries: [
          {
            id: '1',
            text: 'hello',
            frequency: 5,
            language: 'en',
            createdAt: '2024-01-01',
            lastUsed: '2024-01-01'
          },
          {
            id: '2',
            text: 'world',
            frequency: 3,
            language: 'en',
            createdAt: '2024-01-01',
            lastUsed: '2024-01-01'
          },
          {
            id: '3',
            text: 'hola',
            frequency: 2,
            language: 'es',
            createdAt: '2024-01-01',
            lastUsed: '2024-01-01'
          }
        ]
      };
      
      const matches = findVocabularyMatches('hello world test', 'en', store);
      expect(matches).toHaveLength(2);
    });

    it('should return empty array when no matches', () => {
      const store: VocabularyStore = {
        version: 1,
        entries: [
          {
            id: '1',
            text: 'hello',
            frequency: 5,
            language: 'en',
            createdAt: '2024-01-01',
            lastUsed: '2024-01-01'
          }
        ]
      };
      
      const matches = findVocabularyMatches('testing xyz', 'en', store);
      expect(matches).toHaveLength(0);
    });

    it('should filter by language', () => {
      const store: VocabularyStore = {
        version: 1,
        entries: [
          {
            id: '1',
            text: 'hello',
            frequency: 5,
            language: 'en',
            createdAt: '2024-01-01',
            lastUsed: '2024-01-01'
          },
          {
            id: '2',
            text: 'hola',
            frequency: 3,
            language: 'es',
            createdAt: '2024-01-01',
            lastUsed: '2024-01-01'
          }
        ]
      };
      
      const matchesEn = findVocabularyMatches('hello hola', 'en', store);
      const matchesEs = findVocabularyMatches('hello hola', 'es', store);
      
      expect(matchesEn).toHaveLength(1);
      expect(matchesEs).toHaveLength(1);
      expect(matchesEn[0].text).toBe('hello');
      expect(matchesEs[0].text).toBe('hola');
    });
  });
});
