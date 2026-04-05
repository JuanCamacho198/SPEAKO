import { jest } from "@jest/globals";
import {
  DEFAULT_UPDATER_STATE,
  runUpdaterFlowCheck,
  runUpdaterFlowInstall,
} from "../updater-flow";

describe("updater flow", () => {
  it("returns available state and install ref when update exists", async () => {
    const installMock = jest.fn(async () => Promise.resolve());

    const output = await runUpdaterFlowCheck(async () => ({
      available: true,
      version: "1.4.0",
      currentVersion: "1.3.0",
      body: "Changelog",
      downloadAndInstall: installMock,
    }));

    expect(output.state.available).toBe(true);
    expect(output.state.version).toBe("1.4.0");
    expect(output.installRef).toBe(installMock);
    expect(output.result.currentVersion).toBe("1.3.0");
  });

  it("returns no-update state when update is not available", async () => {
    const output = await runUpdaterFlowCheck(async () => ({
      available: false,
      currentVersion: "1.3.0",
    }));

    expect(output.state.available).toBe(false);
    expect(output.state.message).toContain("No hay actualizaciones");
    expect(output.installRef).toBeNull();
  });

  it("returns platform-limited state when check fails", async () => {
    const output = await runUpdaterFlowCheck(async () => {
      throw new Error("network unavailable");
    });

    expect(output.state.platformLimited).toBe(true);
    expect(output.result.platformLimited).toBe(true);
    expect(output.state.message).toContain("plugins.updater.endpoints");
  });

  it("returns guidance when install is requested without a pending update", async () => {
    const output = await runUpdaterFlowInstall(null);

    expect(output.state).toEqual({
      ...DEFAULT_UPDATER_STATE,
      message: "No hay instalacion disponible. Ejecuta primero 'Buscar actualizaciones'.",
    });
    expect(output.nextInstallRef).toBeNull();
  });

  it("clears install ref on successful install", async () => {
    const installMock = jest.fn(async () => Promise.resolve());

    const output = await runUpdaterFlowInstall(installMock);

    expect(installMock).toHaveBeenCalledTimes(1);
    expect(output.nextInstallRef).toBeNull();
    expect(output.state.message).toContain("instalada");
  });

  it("keeps install ref and reports limited state when install fails", async () => {
    const installMock = jest.fn(async () => {
      throw new Error("signature mismatch");
    });

    const output = await runUpdaterFlowInstall(installMock);

    expect(installMock).toHaveBeenCalledTimes(1);
    expect(output.nextInstallRef).toBe(installMock);
    expect(output.state.available).toBe(true);
    expect(output.state.platformLimited).toBe(true);
  });
});
