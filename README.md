<div align="center">
  <img src="./logo-git.jpg" alt="Speako Logo" width="100%" style="border-radius: 12px; margin-bottom: 20px;" />

  # Speako

  **A frameless, always-on-top, lightning-fast Speech-to-Text widget.**

  [![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?style=for-the-badge&logo=appveyor)](https://github.com/juan-camacho/speako)
  [![Platform](https://img.shields.io/badge/platform-Windows-0078D6.svg?style=for-the-badge&logo=windows)](https://github.com/juan-camacho/speako)
  [![Built with Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131.svg?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app/)
  [![Built with React](https://img.shields.io/badge/React-19.1-61DAFB.svg?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
  [![Package Manager: Bun](https://img.shields.io/badge/Bun-%E2%89%A51.0-black.svg?style=for-the-badge&logo=bun)](https://bun.sh/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

  [Features](#sparkles-features) •
  [Installation](#gear-installation) •
  [Usage](#rocket-usage) •
  [Troubleshooting](#wrench-troubleshooting)

</div>

---

## 📖 Overview

**Speako** is a lightweight, always-on-top Speech-to-Text application that lives silently in your Windows system tray. Built with **Tauri v2**, **React 19**, and **TypeScript**, it uses the native Web Speech Recognition API (via WebView2) to transcribe your voice instantly—no API keys, no monthly fees, and no internet-dependent cloud processing required.

Designed for seamless workflow integration, Speako features a completely frameless, draggable UI that automatically shrinks into an unobtrusive "Mini Widget" bubble after 30 seconds of inactivity.

---

## :sparkles: Features

*   **Frameless & Draggable**: A beautifully minimal, borderless window. Just click anywhere on the app background to drag it around your screen.
*   **Mini Widget Mode**: After 30 seconds of inactivity, Speako intelligently shrinks into a tiny 70x70 floating bubble. Hover over it or click to instantly expand back to full size.
*   **Always on Top**: Keeps your transcription perfectly in view over other windows without getting in the way.
*   **Flawless Continuous Dictation**: Built-in logic seamlessly restarts the speech engine during long pauses, automatically stripping out the unwanted trailing periods (`.`) injected by Windows WebView2, ensuring a fluent transcription experience.
*   **System Tray Integration**: Operates completely hidden from your taskbar. Left-click the tray icon to toggle visibility; right-click for quick settings like "Start with Windows".
*   **Real-time Interim Results**: Watch your words appear on screen as you speak, with an animated visualizer showing microphone activity.
*   **Multi-Language Support**: Instantly switch between English, Spanish, French, German, Portuguese, and more.

---

## :gear: Installation

### Prerequisites

*   **OS:** Windows 10 or 11 (requires WebView2, which is pre-installed on Win 11).
*   **Rust:** Stable toolchain (`rustup`).
*   **C++ Build Tools:** Visual Studio with "Desktop development with C++".
*   **Package Manager:** **[Bun](https://bun.sh/)** (strictly required for this project).

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/juan-camacho/speako.git
   cd speako
   ```

2. **Install dependencies:**
   *Note: Always use `bun`. Do not use `npm` or `pnpm`.*
   ```bash
   bun install
   ```

3. **Run in development mode:**
   ```bash
   bun run tauri dev
   ```
   > *Windows will prompt you for microphone permissions on first launch. Grant access to enable Speech-to-Text.*

### Build for Production

Compile a highly optimized release executable and MSI installer:
```bash
bun run tauri build
```
You can find the generated installers in `src-tauri/target/release/bundle/`.

---

## :rocket: Usage

1. **Launch**: Speako starts minimized in your system tray.
2. **Open**: Left-click the tray icon (or use the autostart feature) to reveal the app.
3. **Record**: Click the **Mic** button to start dictating. Text appears instantly.
4. **Edit & Copy**: Freely edit the transcribed text. Click the **Copy** (⎘) icon to send it to your clipboard.
5. **Mini Widget**: Stop interacting for 30 seconds, and Speako will gracefully shrink into a floating bubble to save screen real estate.
6. **Drag**: Click anywhere in the empty space of the window to move it around your monitors.

---

## :wrench: Troubleshooting

### Rust Build Failing on Windows (Error 1455 / OOM)

When running `bun run tauri build` on Windows machines with limited RAM or a small page file, Cargo's parallel compilation of heavy crates (`wry`, `syn`, `webview2-com`) can trigger an **Out of Memory** or **OS Error 1455 (The paging file is too small for this operation to complete)**.

**The Fix:** You need to limit the number of parallel jobs Cargo uses during the build process.

**In PowerShell:**
```powershell
$env:CARGO_BUILD_JOBS=1; bun run tauri build
```

**In CMD / Command Prompt:**
```cmd
set CARGO_BUILD_JOBS=1 && bun run tauri build
```

*(Optional)* If the error persists, you can manually increase your Windows Virtual Memory:
1. Press `Win + S`, type **Advanced system settings**, and press Enter.
2. Under the **Performance** section, click **Settings**.
3. Go to the **Advanced** tab and click **Change** under Virtual memory.
4. Uncheck "Automatically manage paging file size", select your `C:` drive, choose **Custom size**, and set both Initial and Maximum size to at least `8192` (8 GB) or `16384` (16 GB). Click Set, OK, and restart your PC.

---

## :scroll: License

This project is licensed under the MIT License.

<div align="center">
  <sub>Built with ❤️ using Tauri & React.</sub>
</div>