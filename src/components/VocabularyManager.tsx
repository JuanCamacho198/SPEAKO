import { useState } from 'react';
import { VocabularyList } from './VocabularyList';
import { VocabularyForm } from './VocabularyForm';
import { useCustomVocabulary } from '../hooks/useCustomVocabulary';

interface VocabularyManagerProps {
  collapsed?: boolean;
}

export function VocabularyManager({ collapsed = true }: VocabularyManagerProps) {
  const [isExpanded, setIsExpanded] = useState(!collapsed);
  const {
    vocabulary,
    loading,
    error,
    addWord,
    removeWord,
  } = useCustomVocabulary();

  const handleAddWord = async (text: string, language: 'en' | 'es'): Promise<boolean> => {
    const result = await addWord(text, language);
    return result !== null;
  };

  const handleRemoveWord = async (id: string): Promise<void> => {
    await removeWord(id);
  };

  return (
    <div className={`vocabulary-manager ${isExpanded ? 'expanded' : ''}`}>
      <button 
        className="vocab-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="vocab-toggle-icon">{isExpanded ? '▼' : '▶'}</span>
        <span className="vocab-toggle-label">Vocabulario</span>
        <span className="vocab-toggle-badge">
          {vocabulary.entries.length}
        </span>
      </button>

      {isExpanded && (
        <div className="vocab-panel">
          {error && <div className="vocab-panel-error">{error}</div>}
          
          <VocabularyForm onAdd={handleAddWord} disabled={loading} />
          
          <VocabularyList 
            entries={vocabulary.entries} 
            onRemove={handleRemoveWord}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}