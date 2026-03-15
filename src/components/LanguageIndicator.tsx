import { LanguageDetectionResult } from '../types/language-detection.types';

interface LanguageIndicatorProps {
  result: LanguageDetectionResult | null;
  compact?: boolean;
}

const LANGUAGE_LABELS: Record<string, string> = {
  spa: 'Español',
  eng: 'English',
  fra: 'Français',
  deu: 'Deutsch',
  por: 'Português',
  ita: 'Italiano',
  jpn: '日本語',
  zho: '中文',
};

const LANGUAGE_COLORS: Record<string, string> = {
  spa: '#e74c3c',
  eng: '#3498db',
  fra: '#9b59b6',
  deu: '#f39c12',
  por: '#27ae60',
  ita: '#1abc9c',
  jpn: '#e91e63',
  zho: '#ff5722',
};

export function LanguageIndicator({ result, compact = false }: LanguageIndicatorProps) {
  if (!result) {
    return null;
  }

  const langLabel = LANGUAGE_LABELS[result.language] || result.language.toUpperCase();
  const langColor = LANGUAGE_COLORS[result.language] || 'var(--accent)';
  const confidencePercent = Math.round(result.confidence * 100);

  if (compact) {
    return (
      <span 
        className="language-tag-compact"
        style={{ 
          backgroundColor: `${langColor}20`,
          color: langColor,
          borderColor: langColor,
        }}
        title={`${langLabel} (${confidencePercent}%)`}
      >
        {langLabel}
      </span>
    );
  }

  return (
    <div className="language-indicator">
      <div className="language-main">
        <span 
          className="language-badge"
          style={{ backgroundColor: langColor }}
        >
          {langLabel}
        </span>
        <span className="language-confidence">
          {confidencePercent}%
        </span>
      </div>
      
      {result.isCodeSwitched && (
        <div className="code-switch-indicator" title="Code-switching detected">
          <span className="code-switch-icon">⇄</span>
          <span className="code-switch-label">Code-switch</span>
        </div>
      )}

      {result.segments.length > 1 && (
        <div className="language-segments">
          {result.segments.map((seg, idx) => {
            const segLangLabel = LANGUAGE_LABELS[seg.lang] || seg.lang.toUpperCase();
            const segColor = LANGUAGE_COLORS[seg.lang] || 'var(--accent)';
            return (
              <span 
                key={idx}
                className="segment-tag"
                style={{ 
                  backgroundColor: `${segColor}15`,
                  color: segColor,
                  borderColor: `${segColor}40`,
                }}
                title={`${seg.text.substring(0, 20)}... (${Math.round(seg.confidence * 100)}%)`}
              >
                {segLangLabel}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}