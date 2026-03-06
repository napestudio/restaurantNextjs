"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface DiscoveredPrinter {
  name: string;
  type: string;
}

interface LogEntry {
  ts: string;
  direction: "sent" | "received" | "info";
  payload: string;
}

interface DebugPrintClientProps {
  serverUrl: string;
  certUrl: string;
  rawAddress: string;
}

export function DebugPrintClient({
  serverUrl,
  certUrl,
  rawAddress,
}: DebugPrintClientProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [printers, setPrinters] = useState<DiscoveredPrinter[]>([]);
  const [selectedUsb, setSelectedUsb] = useState("");
  const [networkIp, setNetworkIp] = useState(() => rawAddress.split(":")[0]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [customMsg, setCustomMsg] = useState(
    '{"action":"list"}'
  );

  const addLog = useCallback(
    (direction: LogEntry["direction"], payload: string) => {
      const ts = new Date().toLocaleTimeString("es-AR", { hour12: false });
      setLog((prev) => [...prev, { ts, direction, payload }]);
    },
    []
  );

  const connect = useCallback(() => {
    if (!serverUrl) return;
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    )
      return;

    addLog("info", `Conectando a ${serverUrl}…`);
    const ws = new WebSocket(serverUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      addLog("info", "Conectado");
    };

    ws.onmessage = (event) => {
      addLog("received", event.data);
      try {
        const response = JSON.parse(event.data);
        if (response.type === "printer_list") {
          const list: DiscoveredPrinter[] = response.printers ?? [];
          setPrinters(list);
          if (list.length > 0) setSelectedUsb(list[0].name);
        }
      } catch {
        // raw non-JSON response
      }
    };

    ws.onerror = () => {
      addLog("info", "Error de conexión");
    };

    ws.onclose = () => {
      setIsConnected(false);
      addLog("info", "Desconectado");
    };
  }, [serverUrl, addLog]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const send = useCallback(
    (message: object) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        addLog("info", "No conectado");
        return;
      }
      const raw = JSON.stringify(message);
      wsRef.current.send(raw);
      addLog("sent", raw);
    },
    [addLog]
  );

  const listPrinters = () => send({ action: "list" });

  const testPrint = (tipo: "USB" | "Network") => {
    const printerName = tipo === "USB" ? selectedUsb : networkIp;
    send({
      action: "print",
      data: {
        printer_name: printerName,
        type: tipo,
        content: `TEST ${tipo}\nImpresora: ${printerName}\nFecha: ${new Date().toLocaleString("es-AR")}\ngg-ez-print WSS debug\n`,
        font_size: 1,
        paper_width: 80,
      },
    });
  };

  const sendCustom = () => {
    try {
      send(JSON.parse(customMsg));
    } catch {
      addLog("info", "JSON inválido");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Debug Impresión</h1>
        <p className="text-sm text-gray-500">Solo SUPERADMIN</p>
      </div>

      {/* Connection */}
      <section className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full shrink-0 ${isConnected ? "bg-green-500" : "bg-red-500"}`}
          />
          <span className="font-medium">
            {isConnected ? "Conectado" : "Desconectado"}
          </span>
        </div>

        <div className="text-sm text-gray-600 font-mono break-all">
          {serverUrl || <span className="text-red-500">GGEZPRINTADDRESS no configurado</span>}
        </div>

        {!isConnected && certUrl && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
            <strong>Certificado auto-firmado:</strong> antes de conectar, visitá{" "}
            <a
              href={certUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline font-mono"
            >
              {certUrl}
            </a>{" "}
            y confiá en el certificado.
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={connect}
            disabled={!serverUrl || isConnected}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded disabled:bg-gray-300"
          >
            Conectar
          </button>
          <button
            onClick={disconnect}
            disabled={!isConnected}
            className="px-4 py-2 text-sm bg-gray-600 text-white rounded disabled:bg-gray-300"
          >
            Desconectar
          </button>
        </div>
      </section>

      {/* List Printers */}
      <section className="border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Impresoras</h2>
        <button
          onClick={listPrinters}
          disabled={!isConnected}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded disabled:bg-gray-300"
        >
          Listar impresoras
        </button>
        {printers.length > 0 && (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-2 border">Nombre</th>
                <th className="text-left p-2 border">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {printers.map((p, i) => (
                <tr key={i}>
                  <td className="p-2 border font-mono">{p.name}</td>
                  <td className="p-2 border">{p.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Test USB */}
      <section className="border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Test USB</h2>
        <div className="flex gap-2">
          <select
            className="flex-1 p-2 border rounded text-sm"
            value={selectedUsb}
            onChange={(e) => setSelectedUsb(e.target.value)}
          >
            <option value="">Seleccionar impresora…</option>
            {printers
              .filter((p) => p.type !== "Network")
              .map((p, i) => (
                <option key={i} value={p.name}>
                  {p.name}
                </option>
              ))}
          </select>
          <button
            onClick={() => testPrint("USB")}
            disabled={!isConnected || !selectedUsb}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded disabled:bg-gray-300"
          >
            Enviar Test
          </button>
        </div>
      </section>

      {/* Test Network */}
      <section className="border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Test Red</h2>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 p-2 border rounded text-sm font-mono"
            value={networkIp}
            onChange={(e) => setNetworkIp(e.target.value)}
            placeholder="192.168.1.100"
          />
          <button
            onClick={() => testPrint("Network")}
            disabled={!isConnected || !networkIp}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded disabled:bg-gray-300"
          >
            Enviar Test
          </button>
        </div>
      </section>

      {/* Custom JSON */}
      <section className="border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Mensaje personalizado</h2>
        <textarea
          className="w-full p-2 border rounded text-sm font-mono h-24 resize-y"
          value={customMsg}
          onChange={(e) => setCustomMsg(e.target.value)}
        />
        <button
          onClick={sendCustom}
          disabled={!isConnected}
          className="px-4 py-2 text-sm bg-gray-700 text-white rounded disabled:bg-gray-300"
        >
          Enviar
        </button>
      </section>

      {/* Message Log */}
      <section className="border rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Log de mensajes</h2>
          <button
            onClick={() => setLog([])}
            className="text-xs text-gray-500 underline"
          >
            Limpiar
          </button>
        </div>
        <div className="h-64 overflow-y-auto bg-gray-950 text-gray-100 rounded p-3 font-mono text-xs space-y-1">
          {log.length === 0 && (
            <span className="text-gray-500">Sin mensajes aún…</span>
          )}
          {log.map((entry, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-gray-500 shrink-0">{entry.ts}</span>
              <span
                className={
                  entry.direction === "sent"
                    ? "text-blue-400"
                    : entry.direction === "received"
                      ? "text-green-400"
                      : "text-yellow-400"
                }
              >
                {entry.direction === "sent"
                  ? "→"
                  : entry.direction === "received"
                    ? "←"
                    : "·"}
              </span>
              <span className="break-all">{entry.payload}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </section>
    </div>
  );
}
