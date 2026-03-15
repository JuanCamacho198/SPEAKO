import { loadVocabulary, saveVocabulary, addVocabularyWord, removeVocabularyWord, incrementFrequency, createStorage } from '../../utils/vocabulary-storage';
import { VocabularyStore, VocabularyEntry } from '../../types/custom-vocabulary.types';
import { DEFAULT_VOCABULARY_STORE } from '../../utils/custom-vocabulary.config';

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

describe('vocabulary-storage CRUD operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);
  });

  describe('loadVocabulary', () => {
    it('should return default store when no data exists', async () => {
      const result = await loadVocabulary();
      expect(result).toEqual(DEFAULT_VOCABULARY_STORE);
    });

    it('should return stored vocabulary when data exists', async () => {
      const storedData: VocabularyStore = {
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
      mockLocalStorage['speako_vocabulary'] = JSON.stringify(storedData);
      
      const result = await loadVocabulary();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].text).toBe('hello');
    });

    it('should return default store for corrupted data', async () => {
      mockLocalStorage['speako_vocabulary'] = 'invalid json';
      const result = await loadVocabulary();
      expect(result).toEqual(DEFAULT_VOCABULARY_STORE);
    });
  });

  describe('saveVocabulary', () => {
    it('should save vocabulary to storage', async () => {
      const store: VocabularyStore = {
        version: 1,
        entries: [
          {
            id: '1',
            text: 'test',
            frequency: 1,
            language: 'en',
            createdAt: '2024-01-01',
            lastUsed: '2024-01-01'
          }
        ]
      };
      
      await saveVocabulary(store);
      expect(mockStorageAdapter.set).toHaveBeenCalledWith('speako_vocabulary', store);
    });
  });

  describe('addVocabularyWord', () => {
    it('should add new word to vocabulary', async () => {
      const result = await addVocabularyWord('speako', 'en');
      
      expect(result.text).toBe('speako');
      expect(result.language).toBe('en');
      expect(result.frequency).toBe(1);
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
    });

    it('should increment frequency for existing word', async () => {
      await addVocabularyWord('hello', 'en');
      const result = await addVocabularyWord('hello', 'en');
      
      expect(result.frequency).toBe(2);
    });

    it('should be case insensitive for existing words', async () => {
      await addVocabularyWord('HELLO', 'en');
      const result = await addVocabularyWord('hello', 'en');
      
      expect(result.frequency).toBe(2);
    });

    it('should throw error when vocabulary limit reached', async () => {
      const entries: VocabularyEntry[] = Array.from({ length: 100 }, (_, i) => ({
        id: `id-${i}`,
        text: `word${i}`,
        frequency: 1,
        language: 'en' as const,
        createdAt: '2024-01-01',
        lastUsed: '2024-01-01'
      }));
      mockLocalStorage['speako_vocabulary'] = JSON.stringify({ version: 1, entries });
      
      await expect(addVocabularyWord('newword', 'en')).rejects.toThrow('Vocabulary limit reached');
    });

    it('should store language separately for same word', async () => {
      await addVocabularyWord('test', 'en');
      const result = await addVocabularyWord('test', 'es');
      
      expect(result.frequency).toBe(1);
      expect(result.language).toBe('es');
    });
  });

  describe('removeVocabularyWord', () => {
    it('should remove word from vocabulary', async () => {
      await addVocabularyWord('hello', 'en');
      await removeVocabularyWord('non-existent-id');
      
      const store = await loadVocabulary();
      expect(store.entries.some(e => e.text === 'hello')).toBe(true);
      
      const storeWithEntry = await loadVocabulary();
      const entryId = storeWithEntry.entries[0].id;
      await removeVocabularyWord(entryId);
      
      const finalStore = await loadVocabulary();
      expect(finalStore.entries).toHaveLength(0);
    });
  });

  describe('incrementFrequency', () => {
    it('should increment frequency of existing entry', async () => {
      await addVocabularyWord('hello', 'en');
      const storeBefore = await loadVocabulary();
      const entryId = storeBefore.entries[0].id;
      
      await incrementFrequency(entryId);
      
      const storeAfter = await loadVocabulary();
      expect(storeAfter.entries[0].frequency).toBe(2);
    });

    it('should do nothing for non-existent id', async () => {
      await addVocabularyWord('hello', 'en');
      await incrementFrequency('non-existent-id');
      
      const store = await loadVocabulary();
      expect(store.entries[0].frequency).toBe(1);
    });
  });
});
