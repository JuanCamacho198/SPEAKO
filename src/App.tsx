import { useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TranscriptOutput } from "./components/TextInput";
import { RecognitionControls } from "./components/VoiceControls";
import { SpeechEngine, isSTTSupported } from "./components/SpeechEngine";
import logoUrl from "./assets/logo.svg";
import "./App.css";

export default function App() {
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [isListening, setIsListening] = useState(false);
  // Default language for STT
  const [lang, setLang] = useState("es-MX");
  const [continuous, setContinuous] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const engineRef = useRef<SpeechEngine | null>(null);
  // Track if user manually stopped listening (to distinguish from auto-end in continuous mode)
  const manualStopRef = useRef(false);

  const startListening = useCallback(() => {
    // Reset manual stop flag for a fresh run
    manualStopRef.current = false;
    if (!isSTTSupported()) {
      setError("SpeechRecognition no está soportado en este entorno.");
      return;
    }

    setError(null);
    setInterim("");

    const engine = new SpeechEngine(
      { lang, continuous, interimResults: true },
      {
        onInterim: (text) => setInterim(text),
        onFinal: (text) => {
          setTranscript((prev) => {
            const separator = prev.length > 0 && !prev.endsWith(" ") ? " " : "";
            return prev + separator + text;
          });
          setInterim("");
        },
        onError: (msg) => {
          setError(msg);
          setIsListening(false);
          setInterim("");
        },
        onEnd: () => {
          // End of recognition cycle
          setIsListening(false);
          setInterim("");
          // If continuous mode isEnabled, restart automatically unless user stopped explicitly
          if (continuous && !manualStopRef.current) {
            engineRef.current?.start();
            setIsListening(true);
          }
        },
      }
    );

    engineRef.current = engine;
    engine.start();
    setIsListening(true);
  }, [lang, continuous]);

  const stopListening = useCallback(() => {
    // Mark as manual stop to prevent auto-restart in onEnd
    manualStopRef.current = true;
    engineRef.current?.stop();
    setIsListening(false);
    setInterim("");
  }, []);

  function handleClear() {
    stopListening();
    setTranscript("");
    setInterim("");
    setError(null);
  }

  function handleCopy() {
    if (transcript.trim()) {
      navigator.clipboard.writeText(transcript).catch(() => {});
    }
  }

  function handleClose() {
    invoke("hide_window").catch(() => {});
  }

  // Waveform bar heights — animated while listening
  const bars = isListening
    ? [0.4, 0.7, 1, 0.6, 1, 0.7, 0.4]
    : [0.2, 0.3, 0.4, 0.3, 0.4, 0.3, 0.2];
  const BAR_MAX_H = 20;

  return (
    <div className="app" data-tauri-drag-region>
      {/* Titlebar */}
      <div className="titlebar" data-tauri-drag-region>
        <div className="titlebar-left" data-tauri-drag-region>
          <img src={logoUrl} className="titlebar-logo" alt="" />
          <span className="titlebar-title" data-tauri-drag-region>
            Speako
          </span>
        </div>
        <div className="titlebar-actions">
          <button
            className={`icon-btn${showControls ? " active" : ""}`}
            title="Ajustes de reconocimiento"
            onClick={() => setShowControls((s) => !s)}
          >
            ⚙
          </button>
          <button
            className="icon-btn"
            title="Copiar texto"
            onClick={handleCopy}
            disabled={!transcript.trim()}
          >
            ⎘
          </button>
          <button
            className="icon-btn"
            title="Limpiar"
            onClick={handleClear}
            disabled={!transcript && !isListening}
          >
            ✕
          </button>
          <button className="icon-btn close-btn" onClick={handleClose} title="Ocultar">
            —
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="content">
        {/* Waveform visualizer */}
        <div className={`waveform${isListening ? " waveform--active" : ""}`}>
          {bars.map((h, i) => (
            <div
              key={i}
              className="waveform-bar"
              style={{ height: `${h * BAR_MAX_H}px` }}
            />
          ))}
          {isListening && (
            <span className="listening-label">
              <span className="dot" />
              Escuchando...
            </span>
          )}
        </div>

        {/* Error banner */}
        {error && <div className="error-banner">{error}</div>}

        {/* Transcript output */}
        <TranscriptOutput
          value={transcript}
          interim={interim}
          onChange={setTranscript}
          isListening={isListening}
        />

        {/* Collapsible recognition controls */}
        <div className={`controls-panel${showControls ? " controls-panel--open" : ""}`}>
          <RecognitionControls
            lang={lang}
            continuous={continuous}
            onLangChange={(l) => {
              setLang(l);
              if (isListening) {
                stopListening();
              }
            }}
            onContinuousChange={setContinuous}
          />
        </div>

        {/* Action buttons */}
        <div className="actions">
          <button
            className={`btn btn-primary${isListening ? " btn--listening" : ""}`}
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? (
              <span className="btn-listening-label">
                <span className="dot" />
                Detener
              </span>
            ) : (
              "🎤 Grabar"
            )}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleClear}
            disabled={!transcript && !isListening}
          >
            Limpiar
          </button>
        </div>

        <p className="hint">
          {isListening ? "Habla claramente hacia el micrófono" : "Pulsa Grabar para empezar"}
        </p>
      </div>
    </div>
  );
}
