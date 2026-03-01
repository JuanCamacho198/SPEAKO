import { useState, useRef, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { TranscriptOutput } from "./components/TextInput";
import { RecognitionControls } from "./components/VoiceControls";
import { SpeechEngine, isSTTSupported } from "./components/SpeechEngine";
import "./App.css";

export default function App() {
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [isListening, setIsListening] = useState(false);
  // Default language for STT
  const [lang, setLang] = useState("es-MX");
  const [continuous, setContinuous] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [isMiniMode, setIsMiniMode] = useState(false);

  const engineRef = useRef<SpeechEngine | null>(null);
  // Track if user manually stopped listening (to distinguish from auto-end in continuous mode)
  const manualStopRef = useRef(false);

  // Auto-minimize after 10 seconds of inactivity (empty text and not listening)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (!isListening && !transcript.trim() && !isMiniMode) {
      timeoutId = setTimeout(() => {
        toggleMiniMode();
      }, 15000); // 15 seconds
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isListening, transcript, isMiniMode]);

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
          // Remove trailing period to prevent excessive punctuation on auto-restarts
          let cleanText = text.trim();
          if (cleanText.endsWith('.')) {
            cleanText = cleanText.slice(0, -1);
          }

          setTranscript((prev) => {
            const separator = prev.length > 0 && !prev.endsWith(" ") ? " " : "";
            // Ensure the first letter of the new chunk is lowercased if we just stripped a dot
            // and we are appending to an existing sentence. But it's simpler to just append.
            return prev + separator + cleanText;
          });
          setInterim("");
        },
        onError: (msg) => {
          setError(msg);
          setIsListening(false);
          setInterim("");
        },
        onEnd: () => {
          setInterim("");
          // If continuous mode isEnabled, restart automatically unless user stopped explicitly
          if (continuous && !manualStopRef.current) {
            engineRef.current?.start();
            // Don't set isListening(false) here so UI doesn't flicker
          } else {
            setIsListening(false);
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
      navigator.clipboard.writeText(transcript)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {});
    }
  }

  function handleClose() {
    invoke("hide_window").catch(() => {});
  }

  async function toggleMiniMode() {
    const win = getCurrentWindow();
    if (!isMiniMode) {
      await win.setResizable(true);
      // Resize to a small square for the widget
      await win.setSize(new LogicalSize(70, 70));
      await win.setResizable(false);
      await win.setSkipTaskbar(true);
      setIsMiniMode(true);
    } else {
      await win.setResizable(true);
      // Restore original size
      await win.setSize(new LogicalSize(380, 420));
      await win.setResizable(false);
      await win.setSkipTaskbar(false);
      setIsMiniMode(false);
    }
  }

  const startWindowDrag = (e: React.MouseEvent) => {
    // Only drag on left click, and not if a button or input is clicked
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, select')) return;
    
    getCurrentWindow().startDragging();
  };

  // Waveform bar heights — animated while listening
  const bars = isListening
    ? [0.4, 0.7, 1, 0.6, 1, 0.7, 0.4]
    : [0.2, 0.3, 0.4, 0.3, 0.4, 0.3, 0.2];
  const BAR_MAX_H = 20;

  if (isMiniMode) {
    return (
      <div 
        className={`app mini-mode ${isListening ? 'listening' : ''}`}
        onMouseDown={startWindowDrag}
        data-tauri-drag-region
      >
        <button 
          className="mini-widget-btn" 
          onClick={toggleMiniMode}
          title="Expandir"
        >
          {isListening ? "🎤" : <img src="/logo.png" width={32} alt="logo" style={{borderRadius: '50%'}} />}
        </button>
      </div>
    );
  }

  return (
    <div className="app" onMouseDown={startWindowDrag} data-tauri-drag-region>
      {/* Titlebar */}
      <div className="titlebar" onMouseDown={startWindowDrag} data-tauri-drag-region>
        <div className="titlebar-left" data-tauri-drag-region>
          <img src="/logo.png" className="titlebar-logo" style={{borderRadius: '50%'}} alt="" />
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
            title="Modo Mini Widget"
            onClick={toggleMiniMode}
          >
            ↙
          </button>
          <button
            className="icon-btn close-btn" 
            onClick={handleClose} 
            title="Ocultar a la bandeja"
          >
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

        {/* Bottom Actions */}
        <div className="actions">
          <button
            className="btn-secondary"
            onClick={handleClear}
            disabled={!transcript && !isListening}
            title="Borrar texto"
          >
            Limpiar
          </button>

          <button
            className={`btn-mic${isListening ? " btn-mic--listening" : ""}`}
            onClick={isListening ? stopListening : startListening}
            title={isListening ? "Detener grabación" : "Iniciar grabación"}
          >
            {isListening ? "⏹" : "🎤"}
          </button>

          <button
            className={`btn-copy ${copied ? "success" : ""}`}
            title="Copiar texto"
            onClick={handleCopy}
            disabled={!transcript.trim()}
          >
            {copied ? "✓ ¡Copiado!" : "⎘ Copiar"}
          </button>
        </div>
      </div>
    </div>
  );
}
