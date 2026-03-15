export interface LanguageDetectionConfig {
  enabled: boolean;
  defaultLang: 'en' | 'es';
  showTags: boolean;
  minConfidence?: number;
}

export const DEFAULT_LANGUAGE_DETECTION_CONFIG: LanguageDetectionConfig = {
  enabled: true,
  defaultLang: 'es',
  showTags: false,
  minConfidence: 0.3,
};
