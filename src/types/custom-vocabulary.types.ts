export interface VocabularyEntry {
  id: string;
  text: string;
  frequency: number;
  language: 'en' | 'es';
  createdAt: string;
  lastUsed: string;
}

export interface VocabularyStore {
  version: number;
  entries: VocabularyEntry[];
}

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}
