import { VocabularyEntry, VocabularyStore, StorageAdapter } from '../types/custom-vocabulary.types';
import { DEFAULT_VOCABULARY_STORE } from './custom-vocabulary.config';

const STORAGE_KEY = 'speako_vocabulary';

let storageAdapter: StorageAdapter | null = null;

function generateId(): string {
  return crypto.randomUUID();
}

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

export function createStorage(): StorageAdapter {
  if (storageAdapter) {
    return storageAdapter;
  }

  if (isTauri()) {
    storageAdapter = createTauriStorageSync();
  } else {
    storageAdapter = createLocalStorageAdapter();
  }

  return storageAdapter;
}

function createLocalStorageAdapter(): StorageAdapter {
  return {
    async get<T>(key: string): Promise<T | null> {
      try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      } catch {
        return null;
      }
    },
    async set<T>(key: string, value: T): Promise<void> {
      localStorage.setItem(key, JSON.stringify(value));
    },
    async remove(key: string): Promise<void> {
      localStorage.removeItem(key);
    },
  };
}

function createTauriStorageSync(): StorageAdapter {
  return {
    async get<T>(key: string): Promise<T | null> {
      return createLocalStorageAdapter().get<T>(key);
    },
    async set<T>(key: string, value: T): Promise<void> {
      return createLocalStorageAdapter().set<T>(key, value);
    },
    async remove(key: string): Promise<void> {
      return createLocalStorageAdapter().remove(key);
    },
  };
}

export async function loadVocabulary(): Promise<VocabularyStore> {
  const storage = createStorage();
  const data = await storage.get<VocabularyStore>(STORAGE_KEY);
  
  if (!data || !data.entries) {
    return DEFAULT_VOCABULARY_STORE;
  }
  
  return data;
}

export async function saveVocabulary(store: VocabularyStore): Promise<void> {
  const storage = createStorage();
  await storage.set(STORAGE_KEY, store);
}

export async function addVocabularyWord(
  text: string,
  language: 'en' | 'es'
): Promise<VocabularyEntry> {
  const store = await loadVocabulary();
  
  const existingIndex = store.entries.findIndex(
    (e) => e.text.toLowerCase() === text.toLowerCase()
  );
  
  const now = new Date().toISOString();
  
  if (existingIndex >= 0) {
    store.entries[existingIndex].frequency += 1;
    store.entries[existingIndex].lastUsed = now;
    await saveVocabulary(store);
    return store.entries[existingIndex];
  }
  
  if (store.entries.length >= 100) {
    throw new Error('Vocabulary limit reached (100 words)');
  }
  
  const newEntry: VocabularyEntry = {
    id: generateId(),
    text,
    frequency: 1,
    language,
    createdAt: now,
    lastUsed: now,
  };
  
  store.entries.push(newEntry);
  await saveVocabulary(store);
  
  return newEntry;
}

export async function removeVocabularyWord(id: string): Promise<void> {
  const store = await loadVocabulary();
  store.entries = store.entries.filter((e) => e.id !== id);
  await saveVocabulary(store);
}

export async function incrementFrequency(id: string): Promise<void> {
  const store = await loadVocabulary();
  const entry = store.entries.find((e) => e.id === id);
  
  if (entry) {
    entry.frequency += 1;
    entry.lastUsed = new Date().toISOString();
    await saveVocabulary(store);
  }
}

export function getVocabularyBoost(
  text: string,
  language: 'en' | 'es',
  store: VocabularyStore
): number {
  const entry = store.entries.find(
    (e) => e.text.toLowerCase() === text.toLowerCase() && e.language === language
  );
  
  if (!entry) return 0;
  
  const maxFrequency = Math.max(...store.entries.map((e) => e.frequency), 1);
  return entry.frequency / maxFrequency;
}

export function findVocabularyMatches(
  text: string,
  language: 'en' | 'es',
  store: VocabularyStore
): VocabularyEntry[] {
  const words = text.toLowerCase().split(/\s+/);
  return store.entries.filter(
    (e) => e.language === language && words.includes(e.text.toLowerCase())
  );
}
