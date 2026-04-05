import { useState, useRef, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize, PhysicalPosition, currentMonitor } from "@tauri-apps/api/window";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { TranscriptOutput } from "./components/TextInput";
import { RecognitionControls } from "./components/VoiceControls";
import { SpeechEngine, isSTTSupported } from "./components/SpeechEngine";
import { LanguageIndicator } from "./components/LanguageIndicator";
import { VocabularyManager } from "./components/VocabularyManager";
import { useCustomVocabulary } from "./hooks/useCustomVocabulary";
import { LanguageDetectionResult } from "./types/language-detection.types";
import { DEFAULT_LANGUAGE_DETECTION_CONFIG } from "./utils/language-detection.config";
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

  // Language detection state
  const [languageDetectionResult, setLanguageDetectionResult] = useState<LanguageDetectionResult | null>(null);
  const [languageDetectionEnabled, setLanguageDetectionEnabled] = useState(true);

  // Vocabulary state
  const vocabulary = useCustomVocabulary();
  const [vocabularyEnabled, setVocabularyEnabled] = useState(true);

  // Buffering mode state
  const [bufferingEnabled, setBufferingEnabled] = useState(false);

  const [copied, setCopied] = useState(false);
  const [isMiniMode, setIsMiniMode] = useState(false);

  const engineRef = useRef<SpeechEngine | null>(null);
  // Track if user manually stopped listening (to distinguish from auto-end in continuous mode)
  const manualStopRef = useRef(false);

  // Auto-minimize after 30 seconds of inactivity (empty text and not listening)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (!isListening && !transcript.trim() && !isMiniMode) {
      timeoutId = setTimeout(() => {
        toggleMiniMode();
      }, 30000); // 30 seconds
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isListening, transcript, isMiniMode]);

  // Handle global shortcut
  const isListeningRef = useRef(isListening);
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const startListeningRef = useRef<() => void>(() => {});
  const stopListeningRef = useRef<() => void>(() => {});

  useEffect(() => {
    const shortcut = "CommandOrControl+Shift+Space";
    let registered = false;

    const setupShortcut = async () => {
      try {
        await register(shortcut, (event) => {
          if (event.state === "Pressed") {
            if (isListeningRef.current) {
              stopListeningRef.current();
            } else {
              startListeningRef.current();
            }
          }
        });
        registered = true;
      } catch (err) {
        console.warn("Failed to register global shortcut", err);
      }
    };

    setupShortcut();

    return () => {
      if (registered) {
        unregister(shortcut).catch(err => console.warn("Failed to unregister shortcut", err));
      }
    };
  }, []);

  const startListening = useCallback(() => {
    // Reset manual stop flag for a fresh run
    manualStopRef.current = false;
    if (!isSTTSupported()) {
      setError("SpeechRecognition no está soportado en este entorno.");
      return;
    }

    setError(null);
    setInterim("");
    setLanguageDetectionResult(null);

    const engine = new SpeechEngine(
      { 
        lang, 
        continuous, 
        interimResults: true, 
        silenceTimeoutMs: 3000,
        bufferingEnabled,
        languageDetection: {
          enabled: languageDetectionEnabled,
          config: { ...DEFAULT_LANGUAGE_DETECTION_CONFIG, defaultLang: lang.startsWith('en') ? 'en' : 'es' }
        },
        vocabulary: {
          enabled: vocabularyEnabled,
          store: vocabulary.vocabulary
        }
      },
      {
        onInterim: (text) => setInterim(text),
        onFinal: (result) => {
          const text = typeof result === 'string' ? result : result.text;
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

          // Update language detection result
          if (typeof result === 'object' && result.language) {
            setLanguageDetectionResult({
              language: result.language,
              confidence: result.confidence || 0.5,
              segments: result.segments || [],
              isCodeSwitched: result.isCodeSwitched || false
            });
          }

          setInterim("");
        },
        onError: (msg) => {
          setError(msg);
          setIsListening(false);
          setInterim("");
        },
        onEnd: () => {
          setInterim("");
          setIsListening(false);
        },
      }
    );

    engineRef.current = engine;
    engine.start();
    setIsListening(true);
  }, [lang, continuous, languageDetectionEnabled, vocabularyEnabled, vocabulary.vocabulary, bufferingEnabled]);

  const stopListening = useCallback(() => {
    // Mark as manual stop to prevent auto-restart in onEnd
    manualStopRef.current = true;
    engineRef.current?.stop();
    setIsListening(false);
    setInterim("");
  }, []);

  useEffect(() => {
    startListeningRef.current = startListening;
    stopListeningRef.current = stopListening;
  }, [startListening, stopListening]);

  function handleClear() {
    stopListening();
    setTranscript("");
    setInterim("");
    setError(null);
    setLanguageDetectionResult(null);
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

  function handleExit() {
    invoke("exit_app").catch(() => {});
  }

  async function toggleMiniMode() {
    const win = getCurrentWindow();
    if (!isMiniMode) {
      await win.setResizable(true);
      await win.setShadow(false); // remove the OS shadow box for a clean circle
      // Resize to a small square for the widget
      await win.setSize(new LogicalSize(70, 70));
      await win.setResizable(false);
      await win.setSkipTaskbar(true);
      setIsMiniMode(true);
    } else {
      await win.setResizable(true);
      
      try {
        const monitor = await currentMonitor();
        if (monitor) {
          const scaleFactor = monitor.scaleFactor;
          const pos = await win.outerPosition(); 
          
          const width = 380 * scaleFactor;
          const height = 420 * scaleFactor;
          
          let newX = pos.x;
          let newY = pos.y;

          if (pos.x + width > monitor.position.x + monitor.size.width) {
            newX = monitor.position.x + monitor.size.width - width;
          }
          if (pos.y + height > monitor.position.y + monitor.size.height) {
            newY = monitor.position.y + monitor.size.height - height;
          }

          if (newX < monitor.position.x) newX = monitor.position.x;
          if (newY < monitor.position.y) newY = monitor.position.y;

          if (newX !== pos.x || newY !== pos.y) {
            await win.setPosition(new PhysicalPosition(newX, newY));
          }
        }
      } catch (e) {
        console.error("Failed to constrain window position", e);
      }

      // Restore original size
      await win.setSize(new LogicalSize(380, 420));
      await win.setShadow(true);
      await win.setResizable(false);
      await win.setSkipTaskbar(false);
      setIsMiniMode(false);
    }
  }

  // Waveform bar heights — animated while listening
  const bars = isListening
    ? [0.4, 0.7, 1, 0.6, 1, 0.7, 0.4]
    : [0.2, 0.3, 0.4, 0.3, 0.4, 0.3, 0.2];
  const BAR_MAX_H = 20;

  if (isMiniMode) {
    return (
      <div 
        className={`app mini-mode ${isListening ? 'listening' : ''}`}
        data-tauri-drag-region
        onDoubleClick={toggleMiniMode}
        title="Doble clic para expandir"
      >
        <div className="mini-widget-content" data-tauri-drag-region>
          {isListening ? "🎤" : <img src="/logo.png" width={32} alt="logo" style={{borderRadius: '50%', pointerEvents: 'none'}} />}
        </div>
      </div>
    );
  }

  return (
    <div className="app" data-tauri-drag-region>
      {/* Titlebar */}
      <div className="titlebar" data-tauri-drag-region>
        <div className="titlebar-left" data-tauri-drag-region>
          <img src="/logo.png" className="titlebar-logo" style={{borderRadius: '50%'}} alt="" data-tauri-drag-region />
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
            className="icon-btn" 
            onClick={handleClose} 
            title="Ocultar a la bandeja"
          >
            —
          </button>
          <button
            className="icon-btn close-btn" 
            onClick={handleExit} 
            title="Cerrar completamente"
          >
            ✕
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

          {/* Language Detection Toggle */}
          <div className="control-row">
            <label>Detección de idioma</label>
            <button
              className={`toggle-btn${languageDetectionEnabled ? " toggle-btn--on" : ""}`}
              onClick={() => setLanguageDetectionEnabled(!languageDetectionEnabled)}
            >
              {languageDetectionEnabled ? "ON" : "OFF"}
            </button>
          </div>

          {/* Language Indicator */}
          {languageDetectionEnabled && (
            <LanguageIndicator result={languageDetectionResult} compact />
          )}

          {/* Vocabulary Toggle */}
          <div className="control-row">
            <label>Vocabulario personalizado</label>
            <button
              className={`toggle-btn${vocabularyEnabled ? " toggle-btn--on" : ""}`}
              onClick={() => setVocabularyEnabled(!vocabularyEnabled)}
            >
              {vocabularyEnabled ? "ON" : "OFF"}
            </button>
          </div>

          {/* Buffering Mode Toggle */}
          <div className="control-row">
            <label>Modo buffering</label>
            <button
              className={`toggle-btn${bufferingEnabled ? " toggle-btn--on" : ""}`}
              onClick={() => setBufferingEnabled(!bufferingEnabled)}
            >
              {bufferingEnabled ? "ON" : "OFF"}
            </button>
          </div>

          {/* Vocabulary Manager */}
          <VocabularyManager collapsed />
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
