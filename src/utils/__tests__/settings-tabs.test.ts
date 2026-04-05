import {
  SETTINGS_TABS,
  isSettingsTab,
  resolveSettingsTab,
} from "../settings-tabs";

describe("settings tabs", () => {
  it("contains the required settings sections", () => {
    expect(SETTINGS_TABS.map((tab) => tab.id)).toEqual([
      "general",
      "voice",
      "vocabulary",
      "shortcuts",
      "history",
      "about",
    ]);
  });

  it("recognizes valid tab identifiers", () => {
    expect(isSettingsTab("history")).toBe(true);
    expect(isSettingsTab("about")).toBe(true);
  });

  it("rejects invalid tab identifiers", () => {
    expect(isSettingsTab("advanced")).toBe(false);
  });

  it("falls back to general for unknown tab ids", () => {
    expect(resolveSettingsTab("unknown-tab")).toBe("general");
  });

  it("uses custom fallback when provided", () => {
    expect(resolveSettingsTab("unknown-tab", "history")).toBe("history");
  });
});
