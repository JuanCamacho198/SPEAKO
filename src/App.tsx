import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TextInput } from "./components/TextInput";
import { VoiceControls } from "./components/VoiceControls";
import { speak, stop } from "./components/SpeechEngine";
import "./App.css";

export default function App() {
  const [text, setText] = useState("");
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [voiceURI, setVoiceURI] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [showControls, setShowControls] = useState(false);

  function handleSpeak() {
    if (!text.trim()) return;
    speak(text, { rate, pitch, volume: 1, voiceURI });
    setSpeaking(true);
    const onEnd = () => setSpeaking(false);
    window.speechSynthesis.addEventListener("end", onEnd, { once: true });
  }

  function handleStop() {
    stop();
    setSpeaking(false);
  }

  function handleClose() {
    invoke("hide_window").catch(() => {});
  }

  return (
    <div className="app" data-tauri-drag-region>
      <div className="titlebar" data-tauri-drag-region>
        <span className="titlebar-title" data-tauri-drag-region>
          Speako
        </span>
        <div className="titlebar-actions">
          <button
            className="icon-btn"
            title="Ajustes de voz"
            onClick={() => setShowControls((s) => !s)}
          >
            ⚙
          </button>
          <button className="icon-btn close-btn" onClick={handleClose} title="Cerrar">
            ✕
          </button>
        </div>
      </div>

      <div className="content">
        <TextInput value={text} onChange={setText} onSpeak={handleSpeak} />

        {showControls && (
          <VoiceControls
            rate={rate}
            pitch={pitch}
            voiceURI={voiceURI}
            onRateChange={setRate}
            onPitchChange={setPitch}
            onVoiceChange={setVoiceURI}
          />
        )}

        <div className="actions">
          <button
            className="btn btn-primary"
            onClick={handleSpeak}
            disabled={!text.trim()}
          >
            {speaking ? "Reproduciendo..." : "▶ Reproducir"}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleStop}
            disabled={!speaking}
          >
            ■ Detener
          </button>
        </div>

        <p className="hint">Ctrl+Enter para reproducir</p>
      </div>
    </div>
  );
}
