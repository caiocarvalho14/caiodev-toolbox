
import { useSyncExternalStore } from "react";
import { getLogs, subscribeLogs } from "../../../../logger";

export function ConsoleLogger() {
  const logs = useSyncExternalStore(
    subscribeLogs,
    getLogs,
    getLogs
  );

  return (
    <div className="h-80 overflow-auto rounded-lg bg-[#111827] p-3 font-mono text-xs">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-white">
          Console ({logs.length})
        </span>

        <button
          onClick={() => {
            // Implemente a limpeza no logger central.
          }}
          className="text-gray-400 hover:text-white"
        >
          Limpar
        </button>
      </div>

      {logs.map((log) => (
        <div
          key={log.id}
          className="mb-2 border-b border-white/10 pb-2"
        >
          <span className="mr-2 text-gray-500">
            {log.timestamp}
          </span>

          <span
            className={
              log.type === "error"
                ? "text-red-400"
                : log.type === "warn"
                ? "text-yellow-400"
                : log.type === "info"
                ? "text-blue-400"
                : "text-gray-200"
            }
          >
            [{log.type.toUpperCase()}] {log.message}
          </span>
        </div>
      ))}
    </div>
  );
}
