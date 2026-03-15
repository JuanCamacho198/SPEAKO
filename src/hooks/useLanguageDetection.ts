import { useState, useCallback, useMemo } from 'react';
import {
  LanguageDetectionConfig,
  DEFAULT_LANGUAGE_DETECTION_CONFIG,
} from '../utils/language-detection.config';
import { detectLanguage, detectSegments } from '../utils/language-detection';
import { LanguageDetectionResult, LanguageSegment } from '../types/language-detection.types';

export interface UseLanguageDetectionReturn {
  config: LanguageDetectionConfig;
  lastResult: LanguageDetectionResult | null;
  updateConfig: (config: Partial<LanguageDetectionConfig>) => void;
  detect: (text: string) => LanguageDetectionResult;
  detectSegments: (text: string, minConfidence?: number) => LanguageSegment[];
  enabled: boolean;
}

export function useLanguageDetection(
  initialConfig?: Partial<LanguageDetectionConfig>
): UseLanguageDetectionReturn {
  const [config, setConfig] = useState<LanguageDetectionConfig>({
    ...DEFAULT_LANGUAGE_DETECTION_CONFIG,
    ...initialConfig,
  });

  const [lastResult, setLastResult] = useState<LanguageDetectionResult | null>(null);

  const updateConfig = useCallback((updates: Partial<LanguageDetectionConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const detect = useCallback(
    (text: string): LanguageDetectionResult => {
      const result = detectLanguage(text, config);
      setLastResult(result);
      return result;
    },
    [config]
  );

  const detectSegmentsFn = useCallback(
    (text: string, minConfidence?: number): LanguageSegment[] => {
      return detectSegments(text, minConfidence ?? config.minConfidence ?? 0.3);
    },
    [config.minConfidence]
  );

  const enabled = config.enabled;

  return useMemo(
    () => ({
      config,
      lastResult,
      updateConfig,
      detect,
      detectSegments: detectSegmentsFn,
      enabled,
    }),
    [config, lastResult, updateConfig, detect, detectSegmentsFn, enabled]
  );
}
