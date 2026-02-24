# Speako

A lightweight, always-on-top **Speech-to-Text** app that lives in your Windows system tray. Press record, speak, and your words appear as editable text instantly — no API keys, no internet required.

Built with **Tauri 2 + React + TypeScript**, powered by the native **Web Speech Recognition API** (Windows WebView2).

---

## Features

- **System tray app** — minimal footprint, always available from the taskbar
- **Left-click tray icon** to toggle the floating window show/hide
- **Right-click context menu** with quick actions:
  - Show / Hide window
  - Toggle "Always on top"
  - Toggle "Start with Windows" (autostart)
  - Quit
- **Native speech recognition** — uses the browser's `SpeechRecognition` API via WebView2 (no external service)
- **Interim results** — see partial transcriptions in real time as you speak
- **Animated waveform** — visual feedback while the microphone is active
- **Editable output** — correct or expand the recognized text directly in the textarea
- **Copy to clipboard** — one-click copy of the transcript
- **Language selector** — Spanish, English, French, German, Portuguese and more
- **Continuous mode** — keep the microphone open for long dictation sessions
- **Frameless, draggable window** — no titlebar, always on top, skips the taskbar

---

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Shell    | [Tauri 2](https://tauri.app/)       |
| Frontend | React 19 + TypeScript + Vite 7      |
| STT      | Web Speech API (WebView2 / Windows) |
| Styling  | Plain CSS with animations           |
| Runtime  | [Bun](https://bun.sh/) package manager |

---

## Prerequisites

- [Rust](https://rustup.rs/) (stable toolchain)
- [Bun](https://bun.sh/) >= 1.0
- Windows 10/11 with **WebView2** runtime (pre-installed on Windows 11; available via Windows Update on Windows 10)
- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) or Visual Studio with the "Desktop development with C++" workload
- A working **microphone**

---

## Getting Started

### Install dependencies

```bash
bun install
```

### Run in development mode

```bash
bun run tauri dev
```

> **Microphone permission:** On first use, Windows will prompt you to allow microphone access. Grant it to enable speech recognition.

### Build for production

```bash
bun run tauri build
```

The installer (`.msi` / `.exe`) will be output to `src-tauri/target/release/bundle/`.

---

## Project Structure

```
speako/
├── src/                              # React frontend
│   ├── assets/
│   │   └── logo.svg                  # Sound wave SVG logo
│   ├── components/
│   │   ├── SpeechEngine.ts           # SpeechRecognition wrapper (STT)
│   │   ├── TextInput.tsx             # Transcript output textarea
│   │   └── VoiceControls.tsx         # Language selector + continuous mode toggle
│   ├── speech-recognition.d.ts       # Ambient types for Web Speech API
│   ├── App.tsx                       # Main UI (recording state, waveform, controls)
│   ├── App.css                       # Dark theme + animations
│   └── main.tsx                      # React entry point
├── src-tauri/                        # Tauri / Rust backend
│   ├── src/
│   │   └── lib.rs                    # Tray icon, menu, window commands
│   ├── capabilities/
│   │   └── desktop.json              # Tauri permission grants
│   ├── Cargo.toml
│   └── tauri.conf.json               # App config (window, tray, bundle)
├── index.html
├── package.json
└── vite.config.ts
```

---

## Usage

1. Launch Speako — it starts minimized to the system tray.
2. **Left-click** the tray icon to open the floating window.
3. Click **Grabar** (or the mic button) to start listening.
4. Speak clearly — text appears in real time.
5. Click **Detener** to stop recording.
6. Edit the transcript freely in the text area.
7. Click **⎘** to copy the text to the clipboard.
8. Click **Limpiar** to clear and start over.
9. Use **⚙** to open settings (language, continuous mode).
10. **Right-click** the tray icon for additional options.

---

## License

MIT
