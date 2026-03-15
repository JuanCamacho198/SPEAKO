import { useState, useEffect, useCallback } from 'react';
import {
  VocabularyEntry,
  VocabularyStore,
} from '../types/custom-vocabulary.types';
import {
  loadVocabulary,
  addVocabularyWord,
  removeVocabularyWord,
  incrementFrequency,
} from '../utils/vocabulary-storage';
import { DEFAULT_VOCABULARY_STORE } from '../utils/custom-vocabulary.config';

export interface UseCustomVocabularyReturn {
  vocabulary: VocabularyStore;
  loading: boolean;
  error: string | null;
  addWord: (text: string, language: 'en' | 'es') => Promise<VocabularyEntry | null>;
  removeWord: (id: string) => Promise<void>;
  incrementWordFrequency: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCustomVocabulary(): UseCustomVocabularyReturn {
  const [vocabulary, setVocabulary] = useState<VocabularyStore>(DEFAULT_VOCABULARY_STORE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await loadVocabulary();
      setVocabulary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vocabulary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addWord = useCallback(async (text: string, language: 'en' | 'es'): Promise<VocabularyEntry | null> => {
    try {
      setError(null);
      const entry = await addVocabularyWord(text, language);
      await refresh();
      return entry;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add word';
      setError(message);
      return null;
    }
  }, [refresh]);

  const removeWord = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await removeVocabularyWord(id);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove word';
      setError(message);
    }
  }, [refresh]);

  const incrementWordFrequency = useCallback(async (id: string): Promise<void> => {
    try {
      await incrementFrequency(id);
      await refresh();
    } catch (err) {
      // Silently fail for frequency increments
    }
  }, [refresh]);

  const clearAll = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      setVocabulary(DEFAULT_VOCABULARY_STORE);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear vocabulary';
      setError(message);
    }
  }, []);

  return {
    vocabulary,
    loading,
    error,
    addWord,
    removeWord,
    incrementWordFrequency,
    clearAll,
    refresh,
  };
}
