interface TextInputProps {
  value: string;
  onChange: (text: string) => void;
  onSpeak: () => void;
}

export function TextInput({ value, onChange, onSpeak }: TextInputProps) {
  return (
    <textarea
      className="text-input"
      placeholder="Escribe aquí para reproducir..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          onSpeak();
        }
      }}
      rows={4}
      autoFocus
    />
  );
}
