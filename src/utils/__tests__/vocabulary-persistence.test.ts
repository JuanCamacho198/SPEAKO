import { loadVocabulary, saveVocabulary, addVocabularyWord, removeVocabularyWord } from '../../utils/vocabulary-storage';
import { VocabularyStore } from '../../types/custom-vocabulary.types';

const STORAGE_KEY = 'speako_vocabulary';

const mockLocalStorage: Record<string, string> = {};

const mockStorageAdapter = {
  get: jest.fn(async <T>(key: string): Promise<T | null> => {
    const data = mockLocalStorage[key];
    return data ? JSON.parse(data) : null;
  }),
  set: jest.fn(async <T>(key: string, value: T): Promise<void> => {
    mockLocalStorage[key] = JSON.stringify(value);
  }),
  remove: jest.fn(async (key: string): Promise<void> => {
    delete mockLocalStorage[key];
  }),
};

jest.mock('../../utils/vocabulary-storage', () => ({
  ...jest.requireActual('../../utils/vocabulary-storage'),
  createStorage: jest.fn(() => mockStorageAdapter),
}));

describe('Vocabulary Persistence Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);
  });

  describe('Session persistence', () => {
    it('should persist vocabulary across function calls', async () => {
      await addVocabularyWord('speako', 'en');
      await addVocabularyWord('test', 'es');
      
      const store = await loadVocabulary();
      expect(store.entries).toHaveLength(2);
    });

    it('should maintain frequency counts after reload', async () => {
      await addVocabularyWord('hello', 'en');
      await addVocabularyWord('hello', 'en');
      await addVocabularyWord('hello', 'en');
      
      const store = await loadVocabulary();
      const entry = store.entries.find(e => e.text === 'hello');
      expect(entry?.frequency).toBe(3);
    });
  });

  describe('Multi-session persistence', () => {
    it('should save and reload vocabulary correctly', async () => {
      const initialStore: VocabularyStore = {
        version: 1,
        entries: [
          {
            id: '1',
            text: 'persistent',
            frequency: 10,
            language: 'en',
            createdAt: '2024-01-01T00:00:00.000Z',
            lastUsed: '2024-01-01T00:00:00.000Z'
          },
          {
            id: '2',
            text: 'permanente',
            frequency: 5,
            language: 'es',
            createdAt: '2024-01-01T00:00:00.000Z',
            lastUsed: '2024-01-01T00:00:00.000Z'
          }
        ]
      };
      
      await saveVocabulary(initialStore);
      
      const reloadedStore = await loadVocabulary();
      expect(reloadedStore.entries).toHaveLength(2);
      expect(reloadedStore.entries[0].text).toBe('persistent');
      expect(reloadedStore.entries[1].text).toBe('permanente');
    });

    it('should preserve timestamps across sessions', async () => {
      const initialStore: VocabularyStore = {
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
      
      await saveVocabulary(initialStore);
      
      const reloadedStore = await loadVocabulary();
      expect(reloadedStore.entries[0].createdAt).toBe('2024-06-15T10:30:00.000Z');
      expect(reloadedStore.entries[0].lastUsed).toBe('2024-06-15T12:00:00.000Z');
    });
  });

  describe('Add/Remove persistence', () => {
    it('should persist word addition across sessions', async () => {
      await addVocabularyWord('newword', 'en');
      
      const store = await loadVocabulary();
      expect(store.entries.some(e => e.text === 'newword')).toBe(true);
    });

    it('should persist word removal across sessions', async () => {
      await addVocabularyWord('toremove', 'en');
      
      let store = await loadVocabulary();
      const idToRemove = store.entries[0].id;
      
      await removeVocabularyWord(idToRemove);
      
      store = await loadVocabulary();
      expect(store.entries.some(e => e.text === 'toremove')).toBe(false);
    });

    it('should handle adding and removing words in sequence', async () => {
      await addVocabularyWord('word1', 'en');
      await addVocabularyWord('word2', 'es');
      await addVocabularyWord('word3', 'en');
      
      let store = await loadVocabulary();
      expect(store.entries).toHaveLength(3);
      
      await removeVocabularyWord(store.entries[1].id);
      
      store = await loadVocabulary();
      expect(store.entries).toHaveLength(2);
      expect(store.entries.map(e => e.text).sort()).toEqual(['word1', 'word3']);
    });
  });

  describe('Empty state handling', () => {
    it('should handle empty vocabulary gracefully', async () => {
      await saveVocabulary({ version: 1, entries: [] });
      
      const store = await loadVocabulary();
      expect(store.entries).toHaveLength(0);
      expect(store.version).toBe(1);
    });

    it('should return default store when no storage exists', async () => {
      const store = await loadVocabulary();
      expect(store.entries).toHaveLength(0);
    });
  });
});
