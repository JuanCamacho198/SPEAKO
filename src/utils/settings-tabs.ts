export const SETTINGS_TABS = [
  { id: "general", label: "General" },
  { id: "voice", label: "Voice Commands" },
  { id: "vocabulary", label: "Vocabulary" },
  { id: "shortcuts", label: "Shortcuts" },
  { id: "history", label: "History" },
  { id: "about", label: "About/Updates" },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];

const SETTINGS_TAB_SET = new Set<string>(SETTINGS_TABS.map((tab) => tab.id));

export function isSettingsTab(value: string): value is SettingsTab {
  return SETTINGS_TAB_SET.has(value);
}

export function resolveSettingsTab(value: string, fallback: SettingsTab = "general"): SettingsTab {
  if (isSettingsTab(value)) {
    return value;
  }
  return fallback;
}
