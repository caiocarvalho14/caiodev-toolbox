export interface NetEntry {
  id: number;
  kind: "fetch" | "xhr";
  method: string;
  url: string;
  startedAt: string;
  pending: boolean;
  duration?: number;
  status?: number;
  statusText?: string;
  error?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
}

const STORAGE_KEY = "app:network";
const MAX_ENTRIES = 200;
const MAX_BODY_LENGTH = 2000;

const SENSITIVE_HEADERS =
  /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|apikey)$/i;
const SENSITIVE_KEYS = /(pass(word)?|senha|token|secret|authorization|api[-_]?key)/i;

function loadEntries(): NetEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // o que estava pendente quando a página morreu foi interrompido
    return (parsed as NetEntry[]).slice(-MAX_ENTRIES).map((e) =>
      e.pending
        ? { ...e, pending: false, error: "Interrompida (a página foi fechada ou travou)" }
        : e
    );
  } catch {
    return [];
  }
}

let entries: NetEntry[] = loadEntries();
let nextId = entries.length ? Math.max(...entries.map((e) => e.id)) : 0;

const listeners = new Set<() => void>();
let initialized = false;
let notifyScheduled = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

/* ───────── store ───────── */

function notify() {
  if (notifyScheduled) return;
  notifyScheduled = true;
  queueMicrotask(() => {
    notifyScheduled = false;
    listeners.forEach((l) => l());
  });
}

function persist() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    try {
      entries = entries.slice(Math.floor(entries.length / 2));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      /* sem o que fazer */
    }
  }
}

function schedulePersist(immediate = false) {
  if (immediate) return persist();
  if (saveTimer) return;
  saveTimer = setTimeout(persist, 300);
}

function begin(data: Omit<NetEntry, "id" | "startedAt" | "pending">): number {
  const id = ++nextId;
  entries = [
    ...entries,
    { ...data, id, startedAt: new Date().toLocaleString(), pending: true },
  ].slice(-MAX_ENTRIES);
  schedulePersist();
  notify();
  return id;
}

function update(id: number, patch: Partial<NetEntry>) {
  entries = entries.map((e) => (e.id === id ? { ...e, ...patch } : e));
  schedulePersist(Boolean(patch.error) || (patch.status ?? 0) >= 400);
  notify();
}

/* ───────── helpers ───────── */

function truncate(text: string) {
  return text.length > MAX_BODY_LENGTH
    ? text.slice(0, MAX_BODY_LENGTH) + "… [truncado]"
    : text;
}

function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redactValue(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k,
      SENSITIVE_KEYS.test(k) ? "[oculto]" : redactValue(v, depth + 1),
    ])
  );
}

function sanitizeBody(text: string) {
  try {
    return truncate(JSON.stringify(redactValue(JSON.parse(text)), null, 2));
  } catch {
    return truncate(text);
  }
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = SENSITIVE_HEADERS.test(key) ? "[oculto]" : value;
  });
  return out;
}

function describeBody(body: unknown): string | undefined {
  if (body == null) return undefined;
  if (typeof body === "string") return sanitizeBody(body);
  if (body instanceof URLSearchParams) return sanitizeBody(body.toString());
  if (body instanceof FormData) {
    const keys = [...new Set([...body.keys()])];
    return `[FormData: ${keys.join(", ")}]`;
  }
  if (body instanceof Blob) return `[Blob ${body.type || "?"} ${body.size}B]`;
  if (body instanceof ArrayBuffer) return `[ArrayBuffer ${body.byteLength}B]`;
  return `[${Object.prototype.toString.call(body)}]`;
}

function isTextual(contentType: string | null) {
  if (!contentType) return false;
  if (contentType.includes("event-stream")) return false;
  return /json|text|xml|html|javascript|x-www-form-urlencoded/i.test(contentType);
}

/* ───────── fetch ───────── */

function patchFetch() {
  if (typeof window.fetch !== "function") return;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let id = -1;
    const start = performance.now();

    try {
      const isRequest = typeof Request !== "undefined" && input instanceof Request;
      const method = (init?.method ?? (isRequest ? input.method : "GET")).toUpperCase();
      const url = isRequest ? input.url : String(input);
      const headers = new Headers(init?.headers ?? (isRequest ? input.headers : undefined));

      id = begin({
        kind: "fetch",
        method,
        url,
        requestHeaders: headersToObject(headers),
        requestBody: describeBody(init?.body),
      });
    } catch {
      /* o monitor nunca deve quebrar a requisição */
    }

    try {
      const res = await originalFetch(input, init);

      if (id !== -1) {
        update(id, {
          pending: false,
          duration: Math.round(performance.now() - start),
          status: res.status,
          statusText: res.statusText,
          responseHeaders: headersToObject(res.headers),
        });

        if (isTextual(res.headers.get("content-type"))) {
          res
            .clone()
            .text()
            .then((text) => update(id, { responseBody: sanitizeBody(text) }))
            .catch(() => {});
        }
      }

      return res;
    } catch (err) {
      if (id !== -1) {
        update(id, {
          pending: false,
          duration: Math.round(performance.now() - start),
          error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        });
      }
      throw err;
    }
  };
}

/* ───────── XMLHttpRequest ───────── */

interface XhrMeta {
  id?: number;
  method: string;
  url: string;
  headers: Record<string, string>;
  start: number;
}

function parseRawHeaders(raw: string) {
  const out: Record<string, string> = {};
  raw
    .trim()
    .split(/[\r\n]+/)
    .filter(Boolean)
    .forEach((line) => {
      const i = line.indexOf(":");
      if (i === -1) return;
      const key = line.slice(0, i).trim();
      out[key] = SENSITIVE_HEADERS.test(key) ? "[oculto]" : line.slice(i + 1).trim();
    });
  return out;
}

function patchXhr() {
  if (typeof XMLHttpRequest === "undefined") return;

  const meta = new WeakMap<XMLHttpRequest, XhrMeta>();
  const proto = XMLHttpRequest.prototype;
  const origOpen = proto.open;
  const origSend = proto.send;
  const origSetHeader = proto.setRequestHeader;

  proto.open = function (this: XMLHttpRequest, ...args: unknown[]) {
    try {
      meta.set(this, {
        method: String(args[0]).toUpperCase(),
        url: String(args[1]),
        headers: {},
        start: 0,
      });
    } catch {
      /* ignore */
    }
    return (origOpen as (...a: unknown[]) => void).apply(this, args);
  } as typeof proto.open;

  proto.setRequestHeader = function (this: XMLHttpRequest, name: string, value: string) {
    const m = meta.get(this);
    if (m) m.headers[name] = SENSITIVE_HEADERS.test(name) ? "[oculto]" : value;
    return origSetHeader.call(this, name, value);
  };

  proto.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
    const m = meta.get(this);

    if (m) {
      try {
        m.start = performance.now();
        m.id = begin({
          kind: "xhr",
          method: m.method,
          url: m.url,
          requestHeaders: m.headers,
          requestBody: describeBody(body),
        });

        let reason: string | undefined;
        this.addEventListener("abort", () => (reason = "Abortada"));
        this.addEventListener("timeout", () => (reason = "Timeout"));
        this.addEventListener("error", () => (reason = "Falha de rede"));

        this.addEventListener("loadend", () => {
          try {
            let responseBody: string | undefined;
            if (this.responseType === "" || this.responseType === "text") {
              responseBody = sanitizeBody(this.responseText);
            } else if (this.responseType === "json") {
              responseBody = sanitizeBody(JSON.stringify(this.response));
            } else {
              responseBody = `[${this.responseType}]`;
            }

            update(m.id!, {
              pending: false,
              duration: Math.round(performance.now() - m.start),
              status: this.status || undefined,
              statusText: this.statusText,
              error: this.status === 0 ? reason ?? "Falha de rede" : undefined,
              responseHeaders: parseRawHeaders(this.getAllResponseHeaders()),
              responseBody: this.status === 0 ? undefined : responseBody,
            });
          } catch {
            /* ignore */
          }
        });
      } catch {
        /* ignore */
      }
    }

    return origSend.call(this, body);
  };
}

/* ───────── API pública ───────── */

export function initNetworkMonitor() {
  if (initialized) return;
  initialized = true;

  patchFetch();
  patchXhr();

  // vão para o logger de console, se ele já tiver sido iniciado
  window.addEventListener("offline", () => console.warn("[rede] ficou OFFLINE"));
  window.addEventListener("online", () => console.info("[rede] voltou ONLINE"));

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") persist();
  });
  window.addEventListener("pagehide", persist);
}

export function subscribeNet(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNetEntries() {
  return entries;
}

export function clearNet() {
  entries = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  notify();
}

export function exportNet() {
  return entries
    .map((e) =>
      [
        `${e.startedAt} ${e.method} ${e.url}`,
        `  → ${e.pending ? "pendente" : e.error ?? `${e.status} ${e.statusText ?? ""}`} ${
          e.duration != null ? `(${e.duration}ms)` : ""
        }`,
        e.requestBody ? `  req: ${e.requestBody}` : "",
        e.responseBody ? `  res: ${e.responseBody}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
}