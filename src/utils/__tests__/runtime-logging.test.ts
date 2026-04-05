import { jest } from "@jest/globals";
import { createRuntimeLogger, initRuntimeLogging } from "../runtime-logging";

describe("runtime logging", () => {
  it("emits initialization info log", () => {
    const sink = { log: jest.fn() };

    initRuntimeLogging("app", sink);

    expect(sink.log).toHaveBeenCalledWith(
      "info",
      "app",
      "runtime logging initialized",
      undefined
    );
  });

  it("routes warn and error messages through sink", () => {
    const sink = { log: jest.fn() };
    const logger = createRuntimeLogger("shortcuts", sink);

    logger.warn("shortcut registration failed", { accelerator: "Alt+K" });
    logger.error("unregister failed", { accelerator: "Alt+K" });

    expect(sink.log).toHaveBeenCalledWith(
      "warn",
      "shortcuts",
      "shortcut registration failed",
      { accelerator: "Alt+K" }
    );
    expect(sink.log).toHaveBeenCalledWith(
      "error",
      "shortcuts",
      "unregister failed",
      { accelerator: "Alt+K" }
    );
  });

  it("handles sink failures without throwing", () => {
    const originalConsoleError = console.error;
    const consoleErrorMock = jest.fn();
    console.error = consoleErrorMock;

    try {
      const logger = createRuntimeLogger("app", {
        log: () => {
          throw new Error("sink down");
        },
      });

      expect(() => logger.warn("will fail sink")).not.toThrow();
      expect(consoleErrorMock).toHaveBeenCalled();
    } finally {
      console.error = originalConsoleError;
    }
  });
});
