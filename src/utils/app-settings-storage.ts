import { VoiceCommandRule } from "./voice-commands";

export type ShortcutAction = "record" | "openSettings" | "openHistory";

export interface ShortcutMapping {
  action: ShortcutAction;
  accelerator: string;
}

export type ShortcutMappings = Record<ShortcutAction, string>;

export interface TranscriptRecord {
  id: string;
  text: string;
  timestamp: number;
}

export interface AppSettingsStore {
  version: 1;
  voiceCommandsEnabled: boolean;
  voiceCommands: VoiceCommandRule[];
  shortcuts: ShortcutMappings;
  history: TranscriptRecord[];
}

const SETTINGS_STORAGE_KEY = "speako_app_settings";
const HISTORY_MAX_ITEMS = 200;

const DEFAULT_SHORTCUTS: ShortcutMappings = {
  record: "CommandOrControl+Shift+Space",
  openSettings: "CommandOrControl+Shift+,",
  openHistory: "CommandOrControl+Shift+H",
};

const DEFAULT_COMMANDS: VoiceCommandRule[] = [
  {
    id: "voice-rule-1",
    trigger: "nueva linea",
    replacement: "\n",
    enabled: true,
  },
];

function getDefaultStore(): AppSettingsStore {
  return {
    version: 1,
    voiceCommandsEnabled: true,
    voiceCommands: DEFAULT_COMMANDS,
    shortcuts: DEFAULT_SHORTCUTS,
    history: [],
  };
}

function hasWindow(): boolean {
  return typeof localStorage !== "undefined";
}

function parseStore(value: unknown): AppSettingsStore | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const data = value as Partial<AppSettingsStore>;
  return {
    version: 1,
    voiceCommandsEnabled:
      typeof data.voiceCommandsEnabled === "boolean"
        ? data.voiceCommandsEnabled
        : true,
    voiceCommands: Array.isArray(data.voiceCommands)
      ? data.voiceCommands.map((rule) => ({
          id: String(rule.id ?? crypto.randomUUID()),
          trigger: String(rule.trigger ?? ""),
          replacement: String(rule.replacement ?? ""),
          enabled: Boolean(rule.enabled),
        }))
      : DEFAULT_COMMANDS,
    shortcuts: {
      ...DEFAULT_SHORTCUTS,
      ...(data.shortcuts ?? {}),
    },
    history: Array.isArray(data.history)
      ? data.history
          .map((item) => ({
            id: String(item.id ?? crypto.randomUUID()),
            text: String(item.text ?? ""),
            timestamp:
              typeof item.timestamp === "number"
                ? item.timestamp
                : Date.now(),
          }))
          .filter((item) => item.text.trim().length > 0)
      : [],
  };
}

export async function loadAppSettings(): Promise<AppSettingsStore> {
  if (!hasWindow()) {
    return getDefaultStore();
  }

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return getDefaultStore();
    }

    const parsed = parseStore(JSON.parse(raw));
    return parsed ?? getDefaultStore();
  } catch {
    return getDefaultStore();
  }
}

export async function saveAppSettings(store: AppSettingsStore): Promise<void> {
  if (!hasWindow()) {
    return;
  }
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(store));
}

export async function saveShortcutMappings(mappings: ShortcutMappings): Promise<void> {
  const store = await loadAppSettings();
  await saveAppSettings({
    ...store,
    shortcuts: {
      ...DEFAULT_SHORTCUTS,
      ...mappings,
    },
  });
}

export async function saveVoiceCommandSettings(
  enabled: boolean,
  rules: VoiceCommandRule[]
): Promise<void> {
  const store = await loadAppSettings();
  await saveAppSettings({
    ...store,
    voiceCommandsEnabled: enabled,
    voiceCommands: rules,
  });
}

export async function addTranscriptToHistory(text: string): Promise<TranscriptRecord[]> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    const store = await loadAppSettings();
    return store.history;
  }

  const store = await loadAppSettings();
  const nextHistory = [
    {
      id: crypto.randomUUID(),
      text: trimmedText,
      timestamp: Date.now(),
    },
    ...store.history,
  ].slice(0, HISTORY_MAX_ITEMS);

  await saveAppSettings({
    ...store,
    history: nextHistory,
  });

  return nextHistory;
}

export async function removeTranscriptFromHistory(id: string): Promise<TranscriptRecord[]> {
  const store = await loadAppSettings();
  const nextHistory = store.history.filter((item) => item.id !== id);

  await saveAppSettings({
    ...store,
    history: nextHistory,
  });

  return nextHistory;
}

export function searchHistory(
  records: TranscriptRecord[],
  query: string
): TranscriptRecord[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return records;
  }

  return records.filter((item) =>
    item.text.toLowerCase().includes(normalized)
  );
}

export function getShortcutConflicts(mappings: ShortcutMappings): string[] {
  const buckets = new Map<string, ShortcutAction[]>();

  (Object.entries(mappings) as Array<[ShortcutAction, string]>).forEach(
    ([action, accelerator]) => {
      const normalized = accelerator.trim().toLowerCase();
      if (!normalized) {
        return;
      }

      const current = buckets.get(normalized) ?? [];
      current.push(action);
      buckets.set(normalized, current);
    }
  );

  const labels: Record<ShortcutAction, string> = {
    record: "Grabar/Detener",
    openSettings: "Abrir configuracion",
    openHistory: "Abrir historial",
  };

  return [...buckets.entries()]
    .filter(([, actions]) => actions.length > 1)
    .map(([accelerator, actions]) => {
      const actionNames = actions.map((action) => labels[action]).join(", ");
      return `Atajo duplicado ${accelerator}: ${actionNames}`;
    });
}

export function getShortcutRegistrationErrorMessage(accelerator: string): string {
  return `No se pudo registrar: ${accelerator}. Verifica conflictos con el sistema.`;
}

export function resolveShortcutStatus(
  localConflicts: string[],
  failedRegistrations: string[]
): string | null {
  if (localConflicts.length > 0) {
    return localConflicts.join(" | ");
  }

  if (failedRegistrations.length === 0) {
    return null;
  }

  return failedRegistrations
    .map((accelerator) => getShortcutRegistrationErrorMessage(accelerator))
    .join(" | ");
}

export { DEFAULT_SHORTCUTS };
