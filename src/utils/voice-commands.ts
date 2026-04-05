export interface VoiceCommandRule {
  id: string;
  trigger: string;
  replacement: string;
  enabled: boolean;
}

export interface VoiceCommandOptions {
  enabled: boolean;
  rules: VoiceCommandRule[];
}

export interface VoiceCommandConflict {
  type: "duplicate-trigger" | "overlapping-trigger";
  message: string;
  ruleIds: string[];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeVoiceTrigger(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function applyVoiceCommands(text: string, options?: VoiceCommandOptions): string {
  if (!options?.enabled || !options.rules.length) {
    return text;
  }

  let output = text;
  const activeRules = [...options.rules]
    .filter((rule) => rule.enabled && normalizeVoiceTrigger(rule.trigger).length > 0)
    .sort(
      (a, b) =>
        normalizeVoiceTrigger(b.trigger).length - normalizeVoiceTrigger(a.trigger).length
    );

  for (const rule of activeRules) {
    const normalizedTrigger = normalizeVoiceTrigger(rule.trigger);
    if (!normalizedTrigger) {
      continue;
    }

    const triggerPattern = normalizedTrigger
      .split(" ")
      .map((part) => escapeRegex(part))
      .join("\\s+");

    const regex = new RegExp(`(^|\\b)${triggerPattern}(?=\\b|$)`, "gi");
    output = output.replace(regex, (_match, leadingBoundary) => {
      const prefix = typeof leadingBoundary === "string" ? leadingBoundary : "";
      return `${prefix}${rule.replacement}`;
    });
  }

  return output;
}

export function findVoiceCommandConflicts(rules: VoiceCommandRule[]): VoiceCommandConflict[] {
  const conflicts: VoiceCommandConflict[] = [];
  const activeRules = rules.filter((rule) => rule.enabled);

  for (let i = 0; i < activeRules.length; i++) {
    for (let j = i + 1; j < activeRules.length; j++) {
      const current = activeRules[i];
      const other = activeRules[j];

      const currentTrigger = normalizeVoiceTrigger(current.trigger);
      const otherTrigger = normalizeVoiceTrigger(other.trigger);

      if (!currentTrigger || !otherTrigger) {
        continue;
      }

      if (currentTrigger === otherTrigger) {
        conflicts.push({
          type: "duplicate-trigger",
          message: `Comandos duplicados: "${current.trigger}"`,
          ruleIds: [current.id, other.id],
        });
        continue;
      }

      if (
        currentTrigger.includes(otherTrigger) ||
        otherTrigger.includes(currentTrigger)
      ) {
        conflicts.push({
          type: "overlapping-trigger",
          message: `Comandos solapados: "${current.trigger}" y "${other.trigger}"`,
          ruleIds: [current.id, other.id],
        });
      }
    }
  }

  return conflicts;
}
