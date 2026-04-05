export type RuntimeLogLevel = "info" | "warn" | "error";

export interface RuntimeLogger {
  info: (message: string, meta?: unknown) => void;
  warn: (message: string, meta?: unknown) => void;
  error: (message: string, meta?: unknown) => void;
}

export interface RuntimeLogSink {
  log: (level: RuntimeLogLevel, scope: string, message: string, meta?: unknown) => void;
}

const defaultSink: RuntimeLogSink = {
  log(level, scope, message, meta) {
    const line = `[${scope}] ${message}`;
    if (level === "error") {
      console.error(line, meta);
      return;
    }

    if (level === "warn") {
      console.warn(line, meta);
      return;
    }

    console.info(line, meta);
  },
};

function emitLog(
  sink: RuntimeLogSink,
  level: RuntimeLogLevel,
  scope: string,
  message: string,
  meta?: unknown
) {
  try {
    sink.log(level, scope, message, meta);
  } catch (error) {
    console.error(`[${scope}] logging sink failure`, error);
  }
}

export function createRuntimeLogger(scope: string, sink: RuntimeLogSink = defaultSink): RuntimeLogger {
  return {
    info(message, meta) {
      emitLog(sink, "info", scope, message, meta);
    },
    warn(message, meta) {
      emitLog(sink, "warn", scope, message, meta);
    },
    error(message, meta) {
      emitLog(sink, "error", scope, message, meta);
    },
  };
}

export function initRuntimeLogging(scope = "app", sink?: RuntimeLogSink): RuntimeLogger {
  const logger = createRuntimeLogger(scope, sink ?? defaultSink);
  logger.info("runtime logging initialized");
  return logger;
}
