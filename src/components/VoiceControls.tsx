// Idiomas soportados por la Web Speech API en Windows (WebView2)
export const LANGUAGES = [
  { code: "es-ES", label: "Español (España)" },
  { code: "es-MX", label: "Español (México)" },
  { code: "es-AR", label: "Español (Argentina)" },
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "fr-FR", label: "Français" },
  { code: "de-DE", label: "Deutsch" },
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "it-IT", label: "Italiano" },
  { code: "ja-JP", label: "日本語" },
  { code: "zh-CN", label: "中文 (简体)" },
];

interface RecognitionControlsProps {
  lang: string;
  continuous: boolean;
  onLangChange: (lang: string) => void;
  onContinuousChange: (v: boolean) => void;
}

export function RecognitionControls({
  lang,
  continuous,
  onLangChange,
  onContinuousChange,
}: RecognitionControlsProps) {
  return (
    <div className="voice-controls">
      <div className="control-row">
        <label>Idioma</label>
        <select value={lang} onChange={(e) => onLangChange(e.target.value)}>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="control-row">
        <label>Continuo</label>
        <button
          className={`toggle-btn${continuous ? " toggle-btn--on" : ""}`}
          onClick={() => onContinuousChange(!continuous)}
          title="En modo continuo el micrófono permanece activo hasta que pulses Detener"
        >
          {continuous ? "ON" : "OFF"}
        </button>
        <span className="toggle-hint">
          {continuous ? "Sigue escuchando" : "Para al terminar de hablar"}
        </span>
      </div>
    </div>
  );
}
