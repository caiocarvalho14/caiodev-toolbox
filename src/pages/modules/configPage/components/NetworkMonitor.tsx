import { useSyncExternalStore } from "react";
import {
  getNetEntries,
  subscribeNet,
  clearNet,
  exportNet,
  type NetEntry,
} from "../../../../network";

function statusColor(e: NetEntry) {
  if (e.pending) return "text-gray-400";
  if (e.error || (e.status ?? 0) >= 400) return "text-red-400";
  if ((e.status ?? 0) >= 300) return "text-yellow-400";
  return "text-green-400";
}

function Block({ title, children }: { title: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="mt-2">
      <div className="text-gray-500">{title}</div>
      <pre className="whitespace-pre-wrap break-all text-gray-200">{children}</pre>
    </div>
  );
}

export function NetworkMonitor() {
  const entries = useSyncExternalStore(subscribeNet, getNetEntries, getNetEntries);

  return (
    <div className="h-80 overflow-auto rounded-lg bg-[#111827] p-3 font-mono text-xs">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-white">Network ({entries.length})</span>
        <div>
          <button
            onClick={() => navigator.clipboard.writeText(exportNet())}
            className="mr-3 text-gray-400 hover:text-white"
          >
            Copiar
          </button>
          <button onClick={clearNet} className="text-gray-400 hover:text-white">
            Limpar
          </button>
        </div>
      </div>

      {[...entries].reverse().map((e) => (
        <details key={e.id} className="mb-2 border-b border-white/10 pb-2">
          <summary className="cursor-pointer break-all">
            <span className="mr-2 text-gray-500">{e.startedAt}</span>
            <span className="mr-2 text-white">{e.method}</span>
            <span className={`mr-2 ${statusColor(e)}`}>
              {e.pending ? "…" : e.error ? "ERR" : e.status}
            </span>
            <span className="text-gray-300">{e.url}</span>
            {e.duration != null && (
              <span className="ml-2 text-gray-500">{e.duration}ms</span>
            )}
          </summary>

          <Block title="Erro">{e.error}</Block>
          <Block title="Request headers">
            {e.requestHeaders && Object.keys(e.requestHeaders).length
              ? JSON.stringify(e.requestHeaders, null, 2)
              : undefined}
          </Block>
          <Block title="Request body">{e.requestBody}</Block>
          <Block title="Response headers">
            {e.responseHeaders && Object.keys(e.responseHeaders).length
              ? JSON.stringify(e.responseHeaders, null, 2)
              : undefined}
          </Block>
          <Block title="Response body">{e.responseBody}</Block>
        </details>
      ))}
    </div>
  );
}