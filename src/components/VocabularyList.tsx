import { VocabularyEntry } from '../types/custom-vocabulary.types';

interface VocabularyListProps {
  entries: VocabularyEntry[];
  onRemove: (id: string) => void;
  loading?: boolean;
}

const LANGUAGE_LABELS = {
  en: 'EN',
  es: 'ES',
};

const LANGUAGE_COLORS = {
  en: '#3498db',
  es: '#e74c3c',
};

export function VocabularyList({ entries, onRemove, loading = false }: VocabularyListProps) {
  if (loading) {
    return (
      <div className="vocabulary-list">
        <div className="vocabulary-loading">Cargando vocabulario...</div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="vocabulary-list">
        <div className="vocabulary-empty">
          No hay palabras en tu vocabulario personalizado
        </div>
      </div>
    );
  }

  const sortedEntries = [...entries].sort((a, b) => b.frequency - a.frequency);

  return (
    <div className="vocabulary-list">
      <div className="vocabulary-list-header">
        <span className="vocab-count">{entries.length} palabra{entries.length !== 1 ? 's' : ''}</span>
      </div>
      
      <div className="vocabulary-entries">
        {sortedEntries.map((entry) => (
          <div key={entry.id} className="vocabulary-entry">
            <div className="entry-content">
              <span 
                className="entry-lang"
                style={{ 
                  color: LANGUAGE_COLORS[entry.language],
                  borderColor: LANGUAGE_COLORS[entry.language],
                }}
              >
                {LANGUAGE_LABELS[entry.language]}
              </span>
              <span className="entry-text">{entry.text}</span>
            </div>
            
            <div className="entry-actions">
              <span className="entry-frequency" title="Frecuencia de uso">
                {entry.frequency}×
              </span>
              <button
                className="entry-remove"
                onClick={() => onRemove(entry.id)}
                title="Eliminar palabra"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}