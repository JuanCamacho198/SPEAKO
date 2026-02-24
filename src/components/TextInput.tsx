interface TranscriptOutputProps {
  value: string;
  interim: string;
  onChange: (text: string) => void;
  isListening: boolean;
}

export function TranscriptOutput({
  value,
  interim,
  onChange,
  isListening,
}: TranscriptOutputProps) {
  return (
    <div className="transcript-wrapper">
      <textarea
        className={`text-input${isListening ? " text-input--listening" : ""}`}
        placeholder={
          isListening
            ? "Escuchando... habla ahora"
            : "El texto reconocido aparecerá aquí. Puedes editarlo libremente."
        }
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        spellCheck
      />
      {interim && (
        <div className="interim-text" aria-live="polite">
          {interim}
        </div>
      )}
    </div>
  );
}
