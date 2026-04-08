# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.1] - 2026-04-07

### Added
- History button in main UI titlebar for easy access
- Version label displayed in bottom-right corner of main UI

## [1.3.0] - 2026-04-05

### Added
- Voice commands engine with support for default and custom commands, including per-command enable/disable controls.
- History persistence with search support for previously captured entries.
- Custom shortcut mappings with conflict detection and handling.
- Logging infrastructure for app-level diagnostics and troubleshooting.
- Auto-update UI flow for check/install actions; production endpoints and updater pubkey are still required for release builds.

### Changed
- Settings UI overhauled into a tabbed modal for clearer navigation and better organization.

### Testing
- 100 tests covering unit, integration, and release-critical flows.

## [1.2.1] - 2026-04-05

### Fixed

#### UI/UX Improvements
- Fixed main layout clipping - microphone, "Limpiar", and "Copiar" buttons now always visible without scrolling
- Reorganized settings panel with CSS Grid - labels no longer overlap with toggles
- Added dynamic version display - shows current app version in settings panel (fetched via Tauri API)

## [1.2.0] - 2026-04-05

### Added

#### Buffered Speech Recognition
- New buffering mode that collects multiple speech segments before processing
- Silence-based buffering (waits for 3 seconds of silence to process buffer)
- Improved handling of natural speech pauses
- Toggle in UI to enable/disable buffering mode
- Pipeline integration: collected segments → language detection → punctuation → output

### Changed
- SpeechEngine accepts `bufferingEnabled` option
- New `processBuffer()` method handles buffered content through the full pipeline

## [1.1.0] - 2026-03-15

### Added

#### Automatic Punctuation
- Automatic punctuation system for voice transcripts
- Period detection based on speech pauses
- Comma detection based on pause duration
- Question marks based on interrogative words (qué, quién, cómo, etc.)
- Exclamation marks based on high confidence
- Automatic sentence capitalization
- Support for Spanish and English

#### Language Detection
- Real-time language detection (Spanish/English)
- Code-switching detection (language switch in the same phrase)
- Visual indicator for detected language
- Detection confidence percentage

#### Custom Vocabulary
- Custom word storage (up to 100 words)
- Usage frequency tracking
- Improved recognition for vocabulary words
- User interface for vocabulary management
- Session persistence
- Support for Spanish and English words

### Changed
- SpeechEngine now returns enriched results with language, confidence, and segments
- Pipeline integration: language detection → vocabulary → punctuation

### Testing
- 71 unit and integration tests
- Language detection tests (EN/ES, code-switching)
- Vocabulary tests (CRUD, persistence)
- Integration tests for the complete pipeline

## [1.0.0] - 2026-03-15

### Added
- Tauri + React desktop application
- Voice recognition using Web Speech API
- User interface for dictating text
- Voice controls (start/stop)
- Configurable keyboard shortcuts
- Basic punctuation system (without AI)
- System tray icon
- Multi-language recognition support
