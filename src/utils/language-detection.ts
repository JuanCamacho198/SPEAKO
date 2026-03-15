import { LanguageSegment, LanguageDetectionResult } from '../types/language-detection.types';
import { LanguageDetectionConfig, DEFAULT_LANGUAGE_DETECTION_CONFIG } from './language-detection.config';

const ENGLISH_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  'hello', 'world', 'today', 'nice', 'day', 'meeting', 'project', 'booking', 'flight',
  'appointment', 'doctor', 'restaurant', 'cafe', 'speako'
]);

const SPANISH_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del',
  'en', 'con', 'por', 'para', 'sin', 'sobre', 'entre', 'yo', 'tu', 'el',
  'ella', 'nosotros', 'ellos', 'ellas', 'ser', 'estar', 'tener', 'hacer', 'poder',
  'decir', 'ver', 'dar', 'saber', 'querer', 'llegar', 'pasar', 'deber', 'poner',
  'parecer', 'quedar', 'creer', 'hablar', 'tener', 'hacer', 'poder', 'decir', 'ver',
  'como', 'mas', 'muy', 'todo', 'pero', 'este', 'ese', 'esto', 'eso', 'cuando',
  'donde', 'quien', 'cual', 'porque', 'aunque', 'si', 'no', 'bien', 'mal', 'grande',
  'pequeeno', 'nuevo', 'viejo', 'bueno', 'malo', 'mucho', 'poco', 'otro', 'mismo',
  'solo', 'ya', 'aun', 'ahora', 'antes', 'despues', 'siempre', 'nunca', 'tambien',
  'aqui', 'alla', 'ahora', 'hoy', 'ayer', 'manana', 'semana', 'mes', 'ano',
  'hola', 'mundo', 'necesito', 'hacer', 'reunion', 'para', 'volar', 'cita', 'doctor',
  'buenos', 'dias', 'tardes', 'noches', 'gracias', 'por favor', 'si', 'como', 'estas'
]);

const ISO6393_TO_ISO6391: Record<string, string> = {
  eng: 'en',
  spa: 'es',
  por: 'pt',
  fra: 'fr',
  deu: 'de',
  ita: 'it',
};

function mapToIso6391(iso6393: string): string {
  return ISO6393_TO_ISO6391[iso6393] || iso6393.substring(0, 2);
}

function countLanguageWords(text: string): { en: number; es: number } {
  const words = text.toLowerCase().split(/\s+/);
  let en = 0;
  let es = 0;

  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (ENGLISH_WORDS.has(cleanWord)) en++;
    if (SPANISH_WORDS.has(cleanWord)) es++;
  }

  return { en, es };
}

function detectSegmentLanguage(text: string): { lang: string; confidence: number } {
  if (!text.trim()) {
    return { lang: 'und', confidence: 0 };
  }

  const { en, es } = countLanguageWords(text);
  const total = en + es;

  if (total === 0) {
    return { lang: 'und', confidence: 0.3 };
  }

  const enRatio = en / total;
  const esRatio = es / total;

  if (enRatio > esRatio && enRatio > 0.5) {
    return { lang: 'en', confidence: Math.min(0.5 + enRatio * 0.5, 1) };
  } else if (esRatio > enRatio && esRatio > 0.5) {
    return { lang: 'es', confidence: Math.min(0.5 + esRatio * 0.5, 1) };
  }

  return { lang: 'und', confidence: 0.4 };
}

function detectPrimaryLanguage(text: string, defaultLang: string): { lang: string; confidence: number } {
  if (!text.trim()) {
    return { lang: defaultLang, confidence: 0.5 };
  }

  const { en, es } = countLanguageWords(text);
  const totalWords = text.split(/\s+/).length;
  const total = en + es;

  if (total === 0) {
    return { lang: defaultLang, confidence: 0.5 };
  }

  const enRatio = en / total;
  const esRatio = es / total;

  if (enRatio > 0.5 && enRatio > esRatio) {
    return { lang: 'en', confidence: Math.min(0.5 + enRatio * 0.5, 1) };
  } else if (esRatio > 0.5 && esRatio > enRatio) {
    return { lang: 'es', confidence: Math.min(0.5 + esRatio * 0.5, 1) };
  }

  if (en > es) {
    return { lang: 'en', confidence: 0.5 + (en - es) / totalWords };
  } else if (es > en) {
    return { lang: 'es', confidence: 0.5 + (es - en) / totalWords };
  }

  return { lang: defaultLang, confidence: 0.5 };
}

export function detectSegments(text: string, minConfidence = 0.3): LanguageSegment[] {
  if (!text.trim()) {
    return [];
  }

  const words = text.split(/\s+/);
  const segments: LanguageSegment[] = [];
  let currentOffset = 0;

  let currentSegmentText = '';
  let currentSegmentStart = currentOffset;

  for (const word of words) {
    const testText = currentSegmentText ? `${currentSegmentText} ${word}` : word;
    const { lang: testLang } = detectSegmentLanguage(testText);
    const { lang: currentLang } = detectSegmentLanguage(currentSegmentText);

    if (currentSegmentText && testLang !== currentLang && currentLang !== 'und') {
      segments.push({
        text: currentSegmentText.trim(),
        lang: mapToIso6391(currentLang),
        confidence: detectSegmentLanguage(currentSegmentText).confidence,
        start: currentSegmentStart,
        end: currentOffset,
      });

      currentSegmentText = word;
      currentSegmentStart = currentOffset;
    } else {
      currentSegmentText = testText;
    }

    currentOffset += word.length + 1;
  }

  if (currentSegmentText.trim()) {
    const { lang, confidence } = detectSegmentLanguage(currentSegmentText);
    segments.push({
      text: currentSegmentText.trim(),
      lang: mapToIso6391(lang),
      confidence,
      start: currentSegmentStart,
      end: currentOffset,
    });
  }

  return segments.filter(s => s.confidence >= minConfidence);
}

export function detectLanguage(
  text: string,
  config: LanguageDetectionConfig = DEFAULT_LANGUAGE_DETECTION_CONFIG
): LanguageDetectionResult {
  if (!config.enabled || !text.trim()) {
    return {
      language: config.defaultLang,
      confidence: 0.5,
      segments: [],
      isCodeSwitched: false,
    };
  }

  const { lang: primaryLang, confidence: primaryConf } = detectPrimaryLanguage(text, config.defaultLang);
  const segments = detectSegments(text);
  const uniqueLangs = new Set(segments.map(s => s.lang));
  const isCodeSwitched = uniqueLangs.size > 1 && !uniqueLangs.has('und');

  return {
    language: primaryLang,
    confidence: primaryConf,
    segments,
    isCodeSwitched,
  };
}

export function getLanguageLabel(lang: string): string {
  const labels: Record<string, string> = {
    en: 'English',
    es: 'Español',
    und: 'Unknown',
  };
  return labels[lang] || lang.toUpperCase();
}
