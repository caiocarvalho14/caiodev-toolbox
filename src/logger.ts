export interface LogEntry {
  id: number;
  type: "log" | "info" | "warn" | "error" | "debug";
  timestamp: string;
  message: string;
}

const STORAGE_KEY = "app:logs";
const MAX_LOGS = 500;
const MAX_MESSAGE_LENGTH = 5000;

function loadLogs(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_LOGS) : [];
  } catch {
    return [];
  }
}

let logs: LogEntry[] = loadLogs();
let nextId = logs.length ? logs[logs.length - 1].id : 0;

const listeners = new Set<() => void>();
const methods = ["log", "info", "warn", "error", "debug"] as const;

let initialized = false;
let notifyScheduled = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function notify() {
  if (notifyScheduled) return;
  notifyScheduled = true;
  queueMicrotask(() => {
    notifyScheduled = false;
    listeners.forEach((listener) => listener());
  });
}

function persist() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // cota cheia ou storage indisponível: descarta a metade mais antiga e tenta de novo
    try {
      logs = logs.slice(Math.floor(logs.length / 2));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch {
      /* sem o que fazer */
    }
  }
}

function schedulePersist(immediate: boolean) {
  if (immediate) return persist();
  if (saveTimer) return;
  saveTimer = setTimeout(persist, 300);
}

function addLog(type: LogEntry["type"], args: unknown[]) {
  let message = args
    .map((arg) => {
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}\n${arg.stack ?? ""}`;
      }
      if (typeof arg === "string") return arg;
      try {
        return JSON.stringify(arg, null, 2) ?? String(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");

  if (message.length > MAX_MESSAGE_LENGTH) {
    message = message.slice(0, MAX_MESSAGE_LENGTH) + "… [truncado]";
  }

  logs = [
    ...logs,
    {
      id: ++nextId,
      type,
      timestamp: new Date().toLocaleString(), // data + hora, já que agora persiste entre sessões
      message,
    },
  ].slice(-MAX_LOGS);

  schedulePersist(type === "error");
  notify();
}

export function initLogger() {
  if (initialized) return;
  initialized = true;

  methods.forEach((type) => {
    const original = console[type];
    console[type] = (...args: unknown[]) => {
      original.apply(console, args);
      addLog(type, args);
    };
  });

  window.addEventListener("error", (event) => {
    addLog("error", [event.message, event.filename, event.lineno, event.error]);
  });

  window.addEventListener("unhandledrejection", (event) => {
    addLog("error", ["Unhandled Promise Rejection:", event.reason]);
  });

  // mobile: a aba pode ser morta sem aviso, então grava ao ir pra segundo plano
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") persist();
  });
  window.addEventListener("pagehide", persist);

  // separador para distinguir sessões no histórico
  addLog("info", ["──────── nova sessão ────────"]);
}

export function subscribeLogs(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLogs() {
  return logs;
}

export function clearLogs() {
  logs = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  notify();
}

export function exportLogs() {
  return logs
    .map((l) => `${l.timestamp} [${l.type.toUpperCase()}] ${l.message}`)
    .join("\n");
}