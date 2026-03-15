export interface LanguageDetectionConfig {
  enabled: boolean;
  defaultLang: 'en' | 'es';
  showTags: boolean;
}

export const DEFAULT_LANGUAGE_DETECTION_CONFIG: LanguageDetectionConfig = {
  enabled: true,
  defaultLang: 'es',
  showTags: false,
};
