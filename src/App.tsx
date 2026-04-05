import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
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
import {
  DEFAULT_SHORTCUTS,
  ShortcutAction,
  TranscriptRecord,
  addTranscriptToHistory,
  getShortcutConflicts,
  loadAppSettings,
  resolveShortcutStatus,
  removeTranscriptFromHistory,
  saveShortcutMappings,
  saveVoiceCommandSettings,
  searchHistory,
} from "./utils/app-settings-storage";
import { resolveSettingsTab, SETTINGS_TABS, SettingsTab } from "./utils/settings-tabs";
import {
  DEFAULT_UPDATER_STATE,
  UpdaterCheckResult,
  UpdaterState,
  runUpdaterFlowCheck,
  runUpdaterFlowInstall,
} from "./utils/updater-flow";
import { initRuntimeLogging } from "./utils/runtime-logging";
import { VoiceCommandRule, findVoiceCommandConflicts } from "./utils/voice-commands";
import "./App.css";

const logger = initRuntimeLogging("app");

export default function App() {
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [isListening, setIsListening] = useState(false);
  // Default language for STT
  const [lang, setLang] = useState("es-MX");
  const [continuous, setContinuous] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>("general");
  const [error, setError] = useState<string | null>(null);

  // Language detection state
  const [languageDetectionResult, setLanguageDetectionResult] = useState<LanguageDetectionResult | null>(null);
  const [languageDetectionEnabled, setLanguageDetectionEnabled] = useState(true);

  // Vocabulary state
  const vocabulary = useCustomVocabulary();
  const [vocabularyEnabled, setVocabularyEnabled] = useState(true);

  // Buffering mode state
  const [bufferingEnabled, setBufferingEnabled] = useState(false);

  const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState(true);
  const [voiceCommands, setVoiceCommands] = useState<VoiceCommandRule[]>([]);

  const [shortcutMappings, setShortcutMappings] = useState<Record<ShortcutAction, string>>(DEFAULT_SHORTCUTS);
  const [shortcutStatus, setShortcutStatus] = useState<string | null>(null);

  const [historyRecords, setHistoryRecords] = useState<TranscriptRecord[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [updaterState, setUpdaterState] = useState<UpdaterState>(DEFAULT_UPDATER_STATE);

  const [copied, setCopied] = useState(false);
  const [isMiniMode, setIsMiniMode] = useState(false);
  const [version, setVersion] = useState<string>("");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const engineRef = useRef<SpeechEngine | null>(null);
  const updateInstallRef = useRef<(() => Promise<void>) | null>(null);
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

  // Handle global shortcuts with customizable mappings
  const isListeningRef = useRef(isListening);
  const showSettingsModalRef = useRef(showSettingsModal);
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    showSettingsModalRef.current = showSettingsModal;
  }, [showSettingsModal]);

  useEffect(() => {
    let mounted = true;
    loadAppSettings()
      .then((store) => {
        if (!mounted) {
          return;
        }
        setVoiceCommandsEnabled(store.voiceCommandsEnabled);
        setVoiceCommands(store.voiceCommands);
        setShortcutMappings(store.shortcuts);
        setHistoryRecords(store.history);
        setSettingsLoaded(true);
      })
      .catch(() => {
        if (mounted) {
          setSettingsLoaded(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!settingsLoaded) {
      return;
    }
    saveVoiceCommandSettings(voiceCommandsEnabled, voiceCommands).catch(() => {
      setError("No se pudo guardar la configuracion de comandos de voz.");
    });
  }, [voiceCommandsEnabled, voiceCommands, settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) {
      return;
    }
    saveShortcutMappings(shortcutMappings).catch(() => {
      setShortcutStatus("No se pudo guardar la configuracion de atajos.");
    });
  }, [shortcutMappings, settingsLoaded]);

  const voiceCommandConflicts = useMemo(
    () => findVoiceCommandConflicts(voiceCommands),
    [voiceCommands]
  );

  const shortcutConflicts = useMemo(
    () => getShortcutConflicts(shortcutMappings),
    [shortcutMappings]
  );

  const filteredHistoryRecords = useMemo(
    () => searchHistory(historyRecords, historySearch),
    [historyRecords, historySearch]
  );

  const runUpdaterCheck = useCallback(async (): Promise<UpdaterCheckResult> => {
    setUpdaterState({ ...DEFAULT_UPDATER_STATE, checking: true });

    const mod = (await import("@tauri-apps/plugin-updater")) as {
      check: () => Promise<{ available: boolean; version?: string; currentVersion?: string; body?: string; downloadAndInstall?: () => Promise<void> }>;
    };

    const next = await runUpdaterFlowCheck(() => mod.check());
    updateInstallRef.current = next.installRef;
    setUpdaterState(next.state);
    return next.result;
  }, []);

  const installAvailableUpdate = useCallback(async () => {
    setUpdaterState((prev) => ({ ...prev, checking: true }));

    const next = await runUpdaterFlowInstall(updateInstallRef.current);
    updateInstallRef.current = next.nextInstallRef;
    setUpdaterState(next.state);
  }, []);

  const startListeningRef = useRef<() => void>(() => {});
  const stopListeningRef = useRef<() => void>(() => {});

  useEffect(() => {
    const activeShortcuts: string[] = [];
    const localConflicts = getShortcutConflicts(shortcutMappings);
    const failedRegistrations: string[] = [];

    const shortcutHandlers: Record<ShortcutAction, () => void> = {
      record: () => {
        if (isListeningRef.current) {
          stopListeningRef.current();
        } else {
          startListeningRef.current();
        }
      },
      openSettings: () => {
        const opening = !showSettingsModalRef.current;
        setShowSettingsModal(opening);
        if (opening) {
          setActiveSettingsTab("general");
        }
      },
      openHistory: () => {
        setShowSettingsModal(true);
        setActiveSettingsTab("history");
      },
    };

    const setupShortcuts = async () => {
      if (localConflicts.length > 0) {
        setShortcutStatus(resolveShortcutStatus(localConflicts, failedRegistrations));
        return;
      }

      setShortcutStatus(resolveShortcutStatus(localConflicts, failedRegistrations));
      for (const [action, accelerator] of Object.entries(shortcutMappings) as Array<[ShortcutAction, string]>) {
        const normalized = accelerator.trim();
        if (!normalized) {
          continue;
        }

        try {
          await register(normalized, (event: { state: string }) => {
            if (event.state === "Pressed") {
              shortcutHandlers[action]();
            }
          });
          activeShortcuts.push(normalized);
        } catch (err) {
          logger.warn(`Failed to register shortcut '${normalized}' for '${action}'`, err);
          failedRegistrations.push(normalized);
          setShortcutStatus(resolveShortcutStatus(localConflicts, failedRegistrations));
        }
      }
    };

    setupShortcuts();

    return () => {
      for (const shortcut of activeShortcuts) {
        unregister(shortcut).catch((err: unknown) => {
          logger.warn(`Failed to unregister shortcut '${shortcut}'`, err);
        });
      }
    };
  }, [shortcutMappings]);

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
        },
        voiceCommands: {
          enabled: voiceCommandsEnabled,
          rules: voiceCommands,
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

          addTranscriptToHistory(cleanText)
            .then((records) => {
              setHistoryRecords(records);
            })
            .catch(() => {
              setError("No se pudo persistir el historial de transcripcion.");
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
  }, [
    lang,
    continuous,
    languageDetectionEnabled,
    vocabularyEnabled,
    vocabulary.vocabulary,
    bufferingEnabled,
    voiceCommandsEnabled,
    voiceCommands,
  ]);

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

  async function saveCurrentTranscriptToHistory() {
    const next = await addTranscriptToHistory(transcript);
    setHistoryRecords(next);
  }

  async function removeHistoryRecord(id: string) {
    const next = await removeTranscriptFromHistory(id);
    setHistoryRecords(next);
  }

  function updateShortcut(action: ShortcutAction, value: string) {
    setShortcutMappings((prev) => ({
      ...prev,
      [action]: value,
    }));
  }

  function updateVoiceCommand(id: string, patch: Partial<VoiceCommandRule>) {
    setVoiceCommands((prev) => prev.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  }

  function addVoiceCommand() {
    setVoiceCommands((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        trigger: "",
        replacement: "",
        enabled: true,
      },
    ]);
  }

  function removeVoiceCommand(id: string) {
    setVoiceCommands((prev) => prev.filter((rule) => rule.id !== id));
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

  // Fetch version on mount
  useEffect(() => {
    getVersion()
      .then((v) => setVersion(v))
      .catch(() => setVersion("1.0.0"));
  }, []);

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
            className={`icon-btn${showSettingsModal ? " active" : ""}`}
            title="Abrir configuración"
            onClick={() => {
              setShowSettingsModal(true);
              setActiveSettingsTab("general");
            }}
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

        {showSettingsModal && (
          <div className="settings-backdrop" onClick={() => setShowSettingsModal(false)}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
              <div className="settings-modal-header">
                <h2>Configuracion</h2>
                <button
                  className="icon-btn"
                  title="Cerrar configuracion"
                  onClick={() => setShowSettingsModal(false)}
                >
                  ✕
                </button>
              </div>

                <div className="settings-tabs">
                 {SETTINGS_TABS.map(({ id, label }) => (
                   <button
                     key={id}
                     className={`settings-tab${activeSettingsTab === id ? " settings-tab--active" : ""}`}
                     onClick={() => setActiveSettingsTab(resolveSettingsTab(id))}
                   >
                     {label}
                   </button>
                 ))}
              </div>

              <div className="settings-panel">
                {activeSettingsTab === "general" && (
                  <>
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

                    <div className="control-row settings-row">
                      <label>Deteccion de idioma</label>
                      <button
                        className={`toggle-btn${languageDetectionEnabled ? " toggle-btn--on" : ""}`}
                        onClick={() => setLanguageDetectionEnabled(!languageDetectionEnabled)}
                      >
                        {languageDetectionEnabled ? "ON" : "OFF"}
                      </button>
                    </div>

                    {languageDetectionEnabled && (
                      <LanguageIndicator result={languageDetectionResult} compact />
                    )}

                    <div className="control-row settings-row">
                      <label>Vocabulario personalizado</label>
                      <button
                        className={`toggle-btn${vocabularyEnabled ? " toggle-btn--on" : ""}`}
                        onClick={() => setVocabularyEnabled(!vocabularyEnabled)}
                      >
                        {vocabularyEnabled ? "ON" : "OFF"}
                      </button>
                    </div>

                    <div className="control-row settings-row">
                      <label>Modo buffering</label>
                      <button
                        className={`toggle-btn${bufferingEnabled ? " toggle-btn--on" : ""}`}
                        onClick={() => setBufferingEnabled(!bufferingEnabled)}
                      >
                        {bufferingEnabled ? "ON" : "OFF"}
                      </button>
                    </div>
                  </>
                )}

                {activeSettingsTab === "voice" && (
                  <div className="settings-stack">
                    <div className="control-row settings-row">
                      <label>Voice Commands</label>
                      <button
                        className={`toggle-btn${voiceCommandsEnabled ? " toggle-btn--on" : ""}`}
                        onClick={() => setVoiceCommandsEnabled(!voiceCommandsEnabled)}
                      >
                        {voiceCommandsEnabled ? "ON" : "OFF"}
                      </button>
                    </div>

                    <p className="settings-note">
                      Los comandos se aplican antes del texto final. Si hay solapes, se prioriza el trigger mas largo.
                    </p>

                    {voiceCommandConflicts.length > 0 && (
                      <div className="settings-warning">
                        {voiceCommandConflicts.map((conflict) => conflict.message).join(" | ")}
                      </div>
                    )}

                    <div className="settings-stack">
                      {voiceCommands.map((rule) => (
                        <div key={rule.id} className="voice-command-row">
                          <input
                            className="settings-input"
                            placeholder="Frase gatillo"
                            value={rule.trigger}
                            onChange={(e) => updateVoiceCommand(rule.id, { trigger: e.target.value })}
                          />
                          <input
                            className="settings-input"
                            placeholder="Reemplazo"
                            value={rule.replacement}
                            onChange={(e) => updateVoiceCommand(rule.id, { replacement: e.target.value })}
                          />
                          <button
                            className={`toggle-btn${rule.enabled ? " toggle-btn--on" : ""}`}
                            onClick={() => updateVoiceCommand(rule.id, { enabled: !rule.enabled })}
                          >
                            {rule.enabled ? "ON" : "OFF"}
                          </button>
                          <button className="btn-secondary" onClick={() => removeVoiceCommand(rule.id)}>
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>

                    <button className="btn-secondary" onClick={addVoiceCommand}>
                      + Agregar comando
                    </button>
                  </div>
                )}

                {activeSettingsTab === "vocabulary" && <VocabularyManager collapsed={false} />}

                {activeSettingsTab === "shortcuts" && (
                  <div className="settings-stack">
                    <p className="settings-note">
                      Personaliza atajos globales. Si hay conflicto con el sistema operativo, el atajo no se registra.
                    </p>

                    <div className="shortcut-grid">
                      <label htmlFor="shortcut-record">Grabar / Detener</label>
                      <input
                        id="shortcut-record"
                        className="settings-input"
                        value={shortcutMappings.record}
                        onChange={(e) => updateShortcut("record", e.target.value)}
                      />

                      <label htmlFor="shortcut-settings">Abrir configuracion</label>
                      <input
                        id="shortcut-settings"
                        className="settings-input"
                        value={shortcutMappings.openSettings}
                        onChange={(e) => updateShortcut("openSettings", e.target.value)}
                      />

                      <label htmlFor="shortcut-history">Abrir historial</label>
                      <input
                        id="shortcut-history"
                        className="settings-input"
                        value={shortcutMappings.openHistory}
                        onChange={(e) => updateShortcut("openHistory", e.target.value)}
                      />
                    </div>

                    {shortcutConflicts.length > 0 && (
                      <div className="settings-warning">{shortcutConflicts.join(" | ")}</div>
                    )}

                    {shortcutStatus && <div className="settings-warning">{shortcutStatus}</div>}
                  </div>
                )}

                {activeSettingsTab === "history" && (
                  <div className="settings-stack">
                    <p className="settings-note">
                      Historial local persistente (localStorage) con busqueda por texto.
                    </p>

                    <input
                      className="settings-input"
                      placeholder="Buscar en historial"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                    />

                    <button className="btn-secondary" onClick={saveCurrentTranscriptToHistory}>
                      Guardar texto actual en historial
                    </button>

                    <div className="history-list">
                      {filteredHistoryRecords.length === 0 && <p className="settings-note">Sin registros todavia.</p>}
                      {filteredHistoryRecords.map((item) => (
                        <div key={item.id} className="history-item">
                          <div>
                            <div className="history-item-time">
                              {new Date(item.timestamp).toLocaleString()}
                            </div>
                            <div className="history-item-text">{item.text}</div>
                          </div>
                          <button className="btn-secondary" onClick={() => removeHistoryRecord(item.id)}>
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeSettingsTab === "about" && (
                  <div className="settings-stack">
                    {version && <div className="version-display">v{version}</div>}
                    <div className="settings-note">
                      Logging y auto-updater estan inicializados. Si faltan endpoint/pubkey en
                      <code> src-tauri/tauri.conf.json</code>, el chequeo mostrara un aviso limitado.
                    </div>
                    <button className="btn-secondary" onClick={() => runUpdaterCheck().catch(() => {})} disabled={updaterState.checking}>
                      {updaterState.checking ? "Buscando..." : "Buscar actualizaciones"}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => installAvailableUpdate().catch(() => {})}
                      disabled={updaterState.checking || !updaterState.available}
                    >
                      Instalar actualizacion
                    </button>
                    {updaterState.version && (
                      <div className="settings-note">Version disponible: {updaterState.version}</div>
                    )}
                    {updaterState.notes && (
                      <div className="settings-note">Notas: {updaterState.notes}</div>
                    )}
                    {updaterState.message && (
                      <div className={updaterState.platformLimited ? "settings-warning" : "settings-note"}>
                        {updaterState.message}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
