# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
