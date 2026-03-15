import { PunctuationConfig, SENSITIVITY_THRESHOLDS } from './punctuation.config';

const INTERROGATIVE_WORDS_EN = [
  'who', 'what', 'where', 'when', 'why', 'how', 'which',
  'does', 'do', 'is', 'are', 'can', 'could', 'would', 'will', 'should', 'have', 'has'
];

const INTERROGATIVE_WORDS_ES = [
  'quién', 'qué', 'dónde', 'cuándo', 'por qué', 'cómo', 'cuál', 'cuáles',
  'es', 'son', 'está', 'están', 'fue', 'fueron', 'hace', 'hay'
];

export interface WordTiming {
  word: string;
  timestamp: number;
}

export interface PunctuationInput {
  text: string;
  wordTimings?: WordTiming[];
  confidence?: number;
  lang: string;
}

function addPeriods(text: string, _periodMs: number): string {
  if (!text.trim()) return text;
  
  const words = text.split(/\s+/);
  if (words.length < 2) return text;

  let result = words[0];
  
  for (let i = 1; i < words.length; i++) {
    const current = words[i];
    const prev = words[i - 1];
    
    const hasPeriod = /[.!?]$/.test(prev);
    
    if (!hasPeriod) {
      const isInterrogative = detectQuestion(text, '');
      if (isInterrogative && i === words.length - 1) {
        result += ' ' + current;
        continue;
      }
      
      if (current.length > 0 && /^[A-Z]/.test(current)) {
        result += '. ' + current;
      } else {
        result += ' ' + current;
      }
    } else {
      result += ' ' + current;
    }
  }
  
  return result;
}

function addCommas(text: string, _commaMs: number): string {
  return text;
}

function detectQuestion(text: string, lang: string): boolean {
  const normalizedText = text.toLowerCase().trim();
  const firstWord = normalizedText.split(/\s+/)[0];
  
  const interrogativeList = lang.startsWith('es') ? INTERROGATIVE_WORDS_ES : INTERROGATIVE_WORDS_EN;
  
  return interrogativeList.some(word => normalizedText.startsWith(word + ' ') || firstWord === word);
}

function capitalizeSentence(text: string): string {
  if (!text.trim()) return text;
  
  return text.replace(/(^\s*|[.!?]\s+)([a-záéíóúüñ])/g, (_match, prefix, letter) => {
    return prefix + letter.toUpperCase();
  });
}

export function processPunctuation(
  input: PunctuationInput,
  config: PunctuationConfig
): string {
  try {
    if (!config.enabled) {
      return input.text;
    }

    if (!input.text.trim()) {
      return input.text;
    }

    const thresholds = SENSITIVITY_THRESHOLDS[config.sensitivity];
    
    let result = input.text;
    
    result = addPeriods(result, thresholds.periodMs);
    result = addCommas(result, thresholds.commaMs);
    
    if (detectQuestion(result, input.lang)) {
      const trimmed = result.trim();
      if (!/[?!.]$/.test(trimmed)) {
        result = trimmed + '?';
      }
    }
    
    result = capitalizeSentence(result);
    
    return result;
  } catch {
    return input.text;
  }
}
