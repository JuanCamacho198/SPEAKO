declare module "@tauri-apps/plugin-updater" {
  export interface UpdateInfo {
    available: boolean;
    version?: string;
    currentVersion?: string;
    body?: string;
    downloadAndInstall?: () => Promise<void>;
  }

  export function check(): Promise<UpdateInfo>;
}
