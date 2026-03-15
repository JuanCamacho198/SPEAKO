export interface LanguageSegment {
  text: string;
  lang: string;
  confidence: number;
  start: number;
  end: number;
}

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  segments: LanguageSegment[];
  isCodeSwitched: boolean;
}
