import { useState } from 'react';

interface VocabularyFormProps {
  onAdd: (text: string, language: 'en' | 'es') => Promise<boolean>;
  disabled?: boolean;
}

export function VocabularyForm({ onAdd, disabled = false }: VocabularyFormProps) {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState<'en' | 'es'>('es');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedText = text.trim();
    if (!trimmedText) {
      setError('Ingresa una palabra');
      return;
    }

    if (trimmedText.length > 50) {
      setError('La palabra es muy larga (máx. 50 caracteres)');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await onAdd(trimmedText, language);
      if (result) {
        setText('');
        setLanguage('es');
      } else {
        setError('Error al agregar la palabra');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar la palabra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="vocabulary-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <input
          type="text"
          className="vocab-input"
          placeholder="Nueva palabra..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled || loading}
          maxLength={50}
        />
        
        <select
          className="vocab-lang-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'en' | 'es')}
          disabled={disabled || loading}
        >
          <option value="es">ES</option>
          <option value="en">EN</option>
        </select>
      </div>

      {error && <div className="vocab-error">{error}</div>}

      <button
        type="submit"
        className="vocab-add-btn"
        disabled={disabled || loading || !text.trim()}
      >
        {loading ? 'Agregando...' : '+ Agregar'}
      </button>
    </form>
  );
}