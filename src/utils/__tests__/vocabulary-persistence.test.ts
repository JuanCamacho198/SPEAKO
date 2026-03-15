import { VocabularyStore } from '../../types/custom-vocabulary.types';

describe('VocabularyStore types and defaults', () => {
  describe('VocabularyStore structure', () => {
    it('should have correct version field', () => {
      const store: VocabularyStore = {
        version: 1,
        entries: []
      };
      expect(store.version).toBe(1);
    });

    it('should store multiple entries', () => {
      const store: VocabularyStore = {
        version: 1,
        entries: [
          {
            id: '1',
            text: 'hello',
            frequency: 5,
            language: 'en',
            createdAt: '2024-01-01T00:00:00.000Z',
            lastUsed: '2024-01-01T00:00:00.000Z'
          },
          {
            id: '2',
            text: 'hola',
            frequency: 3,
            language: 'es',
            createdAt: '2024-01-01T00:00:00.000Z',
            lastUsed: '2024-01-01T00:00:00.000Z'
          }
        ]
      };
      expect(store.entries).toHaveLength(2);
    });

    it('should preserve all entry fields', () => {
      const entry = {
        id: 'test-id',
        text: 'speako',
        frequency: 10,
        language: 'en' as const,
        createdAt: '2024-06-15T10:30:00.000Z',
        lastUsed: '2024-06-15T12:00:00.000Z'
      };
      
      const store: VocabularyStore = {
        version: 1,
        entries: [entry]
      };
      
      expect(store.entries[0]).toEqual(entry);
    });
  });

  describe('VocabularyEntry validation', () => {
    it('should accept valid English entry', () => {
      const entry = {
        id: '1',
        text: 'hello',
        frequency: 1,
        language: 'en' as const,
        createdAt: '2024-01-01',
        lastUsed: '2024-01-01'
      };
      expect(entry.language).toBe('en');
    });

    it('should accept valid Spanish entry', () => {
      const entry = {
        id: '1',
        text: 'hola',
        frequency: 1,
        language: 'es' as const,
        createdAt: '2024-01-01',
        lastUsed: '2024-01-01'
      };
      expect(entry.language).toBe('es');
    });

    it('should handle high frequency values', () => {
      const entry = {
        id: '1',
        text: 'common',
        frequency: 1000,
        language: 'en' as const,
        createdAt: '2024-01-01',
        lastUsed: '2024-01-01'
      };
      expect(entry.frequency).toBe(1000);
    });

    it('should handle zero frequency', () => {
      const entry = {
        id: '1',
        text: 'unused',
        frequency: 0,
        language: 'en' as const,
        createdAt: '2024-01-01',
        lastUsed: '2024-01-01'
      };
      expect(entry.frequency).toBe(0);
    });
  });

  describe('Serialization/deserialization', () => {
    it('should serialize to JSON and back', () => {
      const original: VocabularyStore = {
        version: 1,
        entries: [
          {
            id: '1',
            text: 'test',
            frequency: 5,
            language: 'en',
            createdAt: '2024-06-15T10:30:00.000Z',
            lastUsed: '2024-06-15T12:00:00.000Z'
          }
        ]
      };
      
      const serialized = JSON.stringify(original);
      const deserialized: VocabularyStore = JSON.parse(serialized);
      
      expect(deserialized).toEqual(original);
    });

    it('should handle empty store', () => {
      const store: VocabularyStore = {
        version: 1,
        entries: []
      };
      
      const serialized = JSON.stringify(store);
      const deserialized: VocabularyStore = JSON.parse(serialized);
      
      expect(deserialized.entries).toHaveLength(0);
    });

    it('should preserve timestamps across serialization', () => {
      const original: VocabularyStore = {
        version: 1,
        entries: [
          {
            id: '1',
            text: 'test',
            frequency: 1,
            language: 'en',
            createdAt: '2024-06-15T10:30:00.000Z',
            lastUsed: '2024-06-15T12:00:00.000Z'
          }
        ]
      };
      
      const serialized = JSON.stringify(original);
      const deserialized: VocabularyStore = JSON.parse(serialized);
      
      expect(deserialized.entries[0].createdAt).toBe('2024-06-15T10:30:00.000Z');
      expect(deserialized.entries[0].lastUsed).toBe('2024-06-15T12:00:00.000Z');
    });
  });
});
