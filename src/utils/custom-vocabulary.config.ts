export const VOCABULARY_LIMIT = 100;

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

export const DEFAULT_VOCABULARY_STORE: VocabularyStore = {
  version: 1,
  entries: [],
};
