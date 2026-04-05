import {
  DEFAULT_SHORTCUTS,
  addTranscriptToHistory,
  getShortcutRegistrationErrorMessage,
  getShortcutConflicts,
  loadAppSettings,
  removeTranscriptFromHistory,
  resolveShortcutStatus,
  saveShortcutMappings,
  saveVoiceCommandSettings,
  searchHistory,
} from "../app-settings-storage";

describe("app settings storage", () => {
  beforeAll(() => {
    const state = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (key: string) => state.get(key) ?? null,
        setItem: (key: string, value: string) => {
          state.set(key, value);
        },
        removeItem: (key: string) => {
          state.delete(key);
        },
        clear: () => {
          state.clear();
        },
      },
      configurable: true,
    });
  });

  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it("loads defaults when empty", async () => {
    const store = await loadAppSettings();
    expect(store.shortcuts).toEqual(DEFAULT_SHORTCUTS);
    expect(store.history).toEqual([]);
    expect(store.voiceCommandsEnabled).toBe(true);
  });

  it("persists shortcut mappings", async () => {
    await saveShortcutMappings({
      ...DEFAULT_SHORTCUTS,
      openHistory: "CommandOrControl+Shift+J",
    });
    const store = await loadAppSettings();
    expect(store.shortcuts.openHistory).toBe("CommandOrControl+Shift+J");
  });

  it("persists voice commands", async () => {
    await saveVoiceCommandSettings(true, [
      {
        id: "cmd-1",
        trigger: "punto",
        replacement: ".",
        enabled: true,
      },
    ]);
    const store = await loadAppSettings();
    expect(store.voiceCommands).toHaveLength(1);
    expect(store.voiceCommands[0].trigger).toBe("punto");
  });

  it("adds and removes history records", async () => {
    const withItem = await addTranscriptToHistory("hola mundo");
    expect(withItem).toHaveLength(1);

    const afterRemove = await removeTranscriptFromHistory(withItem[0].id);
    expect(afterRemove).toHaveLength(0);
  });

  it("searches history records by text", async () => {
    await addTranscriptToHistory("primera prueba");
    const records = await addTranscriptToHistory("segunda linea");

    const result = searchHistory(records, "segunda");
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain("segunda");
  });

  it("searches history records case-insensitively", async () => {
    const records = await addTranscriptToHistory("Linea Mixta");
    const result = searchHistory(records, "linea");
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Linea Mixta");
  });

  it("returns full history when query is blank", async () => {
    await addTranscriptToHistory("primera");
    const records = await addTranscriptToHistory("segunda");
    const result = searchHistory(records, "   ");
    expect(result).toHaveLength(2);
  });

  it("detects duplicate shortcut mappings", () => {
    const conflicts = getShortcutConflicts({
      record: "CommandOrControl+Shift+Space",
      openSettings: "CommandOrControl+Shift+Space",
      openHistory: "CommandOrControl+Shift+H",
    });

    expect(conflicts).toHaveLength(1);
  });

  it("formats shortcut registration error messages", () => {
    expect(getShortcutRegistrationErrorMessage("CommandOrControl+Shift+K")).toContain(
      "No se pudo registrar: CommandOrControl+Shift+K"
    );
  });

  it("prefers local conflicts when resolving shortcut status", () => {
    const status = resolveShortcutStatus(
      ["Atajo duplicado commandorcontrol+shift+h: Abrir historial, Grabar/Detener"],
      ["CommandOrControl+Shift+X"]
    );

    expect(status).toContain("Atajo duplicado");
    expect(status).not.toContain("No se pudo registrar");
  });

  it("returns registration failures when no local conflicts exist", () => {
    const status = resolveShortcutStatus([], ["CommandOrControl+Shift+X", "Alt+F8"]);

    expect(status).toContain("CommandOrControl+Shift+X");
    expect(status).toContain("Alt+F8");
  });
});
