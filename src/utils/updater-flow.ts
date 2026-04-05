export interface UpdaterCheckResult {
  version?: string;
  currentVersion?: string;
  body?: string;
  available: boolean;
  platformLimited?: boolean;
  message?: string;
}

export interface UpdaterState {
  checking: boolean;
  available: boolean;
  version?: string;
  notes?: string;
  message?: string;
  platformLimited?: boolean;
}

export interface UpdaterAdapterResult {
  available: boolean;
  version?: string;
  currentVersion?: string;
  body?: string;
  downloadAndInstall?: () => Promise<void>;
}

export interface UpdaterFlowCheckOutput {
  state: UpdaterState;
  result: UpdaterCheckResult;
  installRef: (() => Promise<void>) | null;
}

const UPDATER_PLATFORM_LIMITED_MESSAGE =
  "Chequeo no disponible. Configura plugins.updater.endpoints y plugins.updater.pubkey en tauri.conf.json para habilitar actualizaciones reales.";

export const DEFAULT_UPDATER_STATE: UpdaterState = {
  checking: false,
  available: false,
};

export async function runUpdaterFlowCheck(
  check: () => Promise<UpdaterAdapterResult>
): Promise<UpdaterFlowCheckOutput> {
  try {
    const update = await check();
    const available = Boolean(update?.available);

    return {
      state: {
        checking: false,
        available,
        version: update?.version,
        notes: update?.body,
        message: available
          ? "Actualizacion disponible para instalar."
          : "No hay actualizaciones disponibles.",
      },
      result: {
        available,
        version: update?.version,
        currentVersion: update?.currentVersion,
        body: update?.body,
      },
      installRef:
        available && typeof update?.downloadAndInstall === "function"
          ? update.downloadAndInstall
          : null,
    };
  } catch {
    return {
      state: {
        checking: false,
        available: false,
        platformLimited: true,
        message: UPDATER_PLATFORM_LIMITED_MESSAGE,
      },
      result: {
        available: false,
        platformLimited: true,
        message: UPDATER_PLATFORM_LIMITED_MESSAGE,
      },
      installRef: null,
    };
  }
}

export async function runUpdaterFlowInstall(
  installRef: (() => Promise<void>) | null
): Promise<{ state: UpdaterState; nextInstallRef: (() => Promise<void>) | null }> {
  if (!installRef) {
    return {
      state: {
        ...DEFAULT_UPDATER_STATE,
        message: "No hay instalacion disponible. Ejecuta primero 'Buscar actualizaciones'.",
      },
      nextInstallRef: null,
    };
  }

  try {
    await installRef();
    return {
      state: {
        checking: false,
        available: false,
        message: "Actualizacion descargada e instalada. Reinicia la aplicacion.",
      },
      nextInstallRef: null,
    };
  } catch {
    return {
      state: {
        checking: false,
        available: true,
        message:
          "No se pudo instalar la actualizacion en este entorno. Verifica canal de release, endpoint y firma.",
        platformLimited: true,
      },
      nextInstallRef: installRef,
    };
  }
}
