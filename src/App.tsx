import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TextInput } from "./components/TextInput";
import { VoiceControls } from "./components/VoiceControls";
import { speak, stop } from "./components/SpeechEngine";
import logoUrl from "./assets/logo.svg";
import "./App.css";

export default function App() {
  const [text, setText] = useState("");
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [voiceURI, setVoiceURI] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [bars, setBars] = useState([0.3, 0.5, 1, 0.7, 1, 0.5, 0.3]);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animate waveform bars while speaking
  useEffect(() => {
    if (speaking) {
      animRef.current = setInterval(() => {
        setBars([
          0.2 + Math.random() * 0.6,
          0.4 + Math.random() * 0.6,
          0.5 + Math.random() * 0.5,
          0.6 + Math.random() * 0.4,
          0.5 + Math.random() * 0.5,
          0.4 + Math.random() * 0.6,
          0.2 + Math.random() * 0.6,
        ]);
      }, 120);
    } else {
      if (animRef.current) clearInterval(animRef.current);
      setBars([0.3, 0.5, 1, 0.7, 1, 0.5, 0.3]);
    }
    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, [speaking]);

  function handleSpeak() {
    if (!text.trim()) return;
    speak(text, { rate, pitch, volume: 1, voiceURI });
    setSpeaking(true);
    // Poll speechSynthesis.speaking as a reliable "done" signal
    const poll = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        setSpeaking(false);
        clearInterval(poll);
      }
    }, 300);
  }

  function handleStop() {
    stop();
    setSpeaking(false);
  }

  function handleClose() {
    invoke("hide_window").catch(() => {});
  }

  const BAR_MAX_H = 20;

  return (
    <div className="app" data-tauri-drag-region>
      {/* Titlebar */}
      <div className="titlebar" data-tauri-drag-region>
        <div className="titlebar-left" data-tauri-drag-region>
          <img src={logoUrl} className="titlebar-logo" alt="" />
          <span className="titlebar-title" data-tauri-drag-region>Speako</span>
        </div>
        <div className="titlebar-actions">
          <button
            className={`icon-btn${showControls ? " active" : ""}`}
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

      {/* Main content */}
      <div className="content">
        <TextInput value={text} onChange={setText} onSpeak={handleSpeak} />

        {/* Waveform visualizer */}
        <div className={`waveform${speaking ? " waveform--active" : ""}`}>
          {bars.map((h, i) => (
            <div
              key={i}
              className="waveform-bar"
              style={{ height: `${h * BAR_MAX_H}px` }}
            />
          ))}
        </div>

        {/* Collapsible voice controls */}
        <div className={`controls-panel${showControls ? " controls-panel--open" : ""}`}>
          <VoiceControls
            rate={rate}
            pitch={pitch}
            voiceURI={voiceURI}
            onRateChange={setRate}
            onPitchChange={setPitch}
            onVoiceChange={setVoiceURI}
          />
        </div>

        <div className="actions">
          <button
            className={`btn btn-primary${speaking ? " btn--speaking" : ""}`}
            onClick={handleSpeak}
            disabled={!text.trim() || speaking}
          >
            {speaking ? (
              <span className="btn-speaking-label">
                <span className="dot" />
                Reproduciendo
              </span>
            ) : (
              "▶ Reproducir"
            )}
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
