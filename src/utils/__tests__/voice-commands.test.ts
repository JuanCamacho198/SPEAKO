import {
  applyVoiceCommands,
  findVoiceCommandConflicts,
  normalizeVoiceTrigger,
  VoiceCommandRule,
} from "../voice-commands";

describe("voice command utilities", () => {
  it("normalizes accent and spacing for triggers", () => {
    expect(normalizeVoiceTrigger("  N\u00faeva   L\u00ednea  ")).toBe("nueva linea");
  });

  it("applies enabled command replacements", () => {
    const rules: VoiceCommandRule[] = [
      { id: "1", trigger: "nueva linea", replacement: "\n", enabled: true },
    ];

    const result = applyVoiceCommands("hola nueva linea mundo", {
      enabled: true,
      rules,
    });

    expect(result).toContain("\n");
  });

  it("prioritizes longer trigger when overlapping", () => {
    const rules: VoiceCommandRule[] = [
      { id: "1", trigger: "nueva", replacement: "A", enabled: true },
      { id: "2", trigger: "nueva linea", replacement: "B", enabled: true },
    ];

    const result = applyVoiceCommands("nueva linea", {
      enabled: true,
      rules,
    });

    expect(result).toBe("B");
  });

  it("detects duplicate and overlapping conflicts", () => {
    const conflicts = findVoiceCommandConflicts([
      { id: "1", trigger: "nueva linea", replacement: "\n", enabled: true },
      { id: "2", trigger: "nueva  linea", replacement: "\n", enabled: true },
      { id: "3", trigger: "nueva", replacement: "", enabled: true },
    ]);

    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts.some((item) => item.type === "duplicate-trigger")).toBe(true);
    expect(conflicts.some((item) => item.type === "overlapping-trigger")).toBe(true);
  });
});
