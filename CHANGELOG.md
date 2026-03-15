# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-03-15

### Added

#### Puntuación Automática
- Sistema de puntuación automática para transcripciones de voz
- Detección de puntos por pausas en el habla
- Detección de comas por duración de pausas
- Signos de interrogación basados en palabras interrogativas (qué, quién, cómo, etc.)
- Signos de exclamación por confianza alta
- Capitalización automática de oraciones
- Soporte para español e inglés

#### Detección de Idioma
- Detección de idioma en tiempo real (Español/Inglés)
- Detección de code-switching (cambio de idioma en la misma frase)
- Indicador visual del idioma detectado
- Porcentaje de confianza de detección

#### Vocabulario Personalizado
- Almacenamiento de palabras personalizadas (hasta 100 palabras)
- Seguimiento de frecuencia de uso
- Mejora del reconocimiento para palabras del vocabulario
- Interfaz de usuario para gestionar vocabulario
- Persistencia entre sesiones
- Soporte para palabras en español e inglés

### Changed
- SpeechEngine ahora retorna resultados enriquecidos con idioma, confianza y segmentos
- Integración del pipeline: detección de idioma → vocabulario → puntuación

### Testing
- 71 tests unitarios y de integración
- Tests para detección de idioma (EN/ES, code-switching)
- Tests para vocabulario (CRUD, persistencia)
- Tests de integración para el pipeline completo

## [1.0.0] - 2026-03-15

### Added
- Aplicación de escritorio Tauri + React
- Reconocimiento de voz usando Web Speech API
- Interfaz de usuario para dictate texto
- Controles de voz (iniciar/detener)
- Atajos de teclado configurables
- Sistema de puntuación básico (sin IA)
- Icono en la bandeja del sistema
- Soporte para múltiples idiomas en reconocimiento
