export type PunctuationSensitivity = 'low' | 'medium' | 'high';

export interface PunctuationConfig {
  enabled: boolean;
  sensitivity: PunctuationSensitivity;
}

export interface PunctuationThresholds {
  commaMs: number;
  periodMs: number;
}

export const DEFAULT_PUNCTUATION_CONFIG: PunctuationConfig = {
  enabled: true,
  sensitivity: 'medium',
};

export const SENSITIVITY_THRESHOLDS: Record<PunctuationSensitivity, PunctuationThresholds> = {
  low:    { commaMs: 600, periodMs: 1000 },
  medium: { commaMs: 400, periodMs: 800 },
  high:   { commaMs: 200, periodMs: 400 },
};
