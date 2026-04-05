declare module "@tauri-apps/plugin-global-shortcut" {
  export type ShortcutEventState = "Pressed" | "Released";

  export interface ShortcutEvent {
    id?: number;
    state: ShortcutEventState | string;
  }

  export function register(
    shortcut: string,
    handler: (event: ShortcutEvent) => void
  ): Promise<void>;

  export function unregister(shortcut: string): Promise<void>;
}
