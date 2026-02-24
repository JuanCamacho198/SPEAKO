import { useEffect, useState } from "react";
import { getVoices } from "./SpeechEngine";

interface VoiceControlsProps {
  rate: number;
  pitch: number;
  voiceURI: string;
  onRateChange: (v: number) => void;
  onPitchChange: (v: number) => void;
  onVoiceChange: (uri: string) => void;
}

export function VoiceControls({
  rate,
  pitch,
  voiceURI,
  onRateChange,
  onPitchChange,
  onVoiceChange,
}: VoiceControlsProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    getVoices().then((v) => {
      setVoices(v);
      if (!voiceURI && v.length > 0) {
        onVoiceChange(v[0].voiceURI);
      }
    });
  }, []);

  return (
    <div className="voice-controls">
      <div className="control-row">
        <label>Voz</label>
        <select value={voiceURI} onChange={(e) => onVoiceChange(e.target.value)}>
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      <div className="control-row">
        <label>Velocidad</label>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={rate}
          onChange={(e) => onRateChange(Number(e.target.value))}
        />
        <span>{rate.toFixed(1)}x</span>
      </div>

      <div className="control-row">
        <label>Tono</label>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={pitch}
          onChange={(e) => onPitchChange(Number(e.target.value))}
        />
        <span>{pitch.toFixed(1)}</span>
      </div>
    </div>
  );
}
