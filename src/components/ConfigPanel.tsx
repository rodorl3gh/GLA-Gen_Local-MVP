"use client";

import { useState, useEffect } from "react";

interface Props {
  onClose: () => void;
}

export default function ConfigPanel({ onClose }: Props) {
  const [prompt, setPrompt] = useState("");
  const [temperature, setTemperature] = useState("0.4");
  const [burstDelay, setBurstDelay] = useState("12000");
  const [maxHistory, setMaxHistory] = useState("20");
  const [model, setModel] = useState("gpt-4o-mini");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings/prompt")
      .then((r) => r.json())
      .then((d) => setPrompt(d.prompt || ""))
      .catch(() => {});

    fetch("/api/settings/agent")
      .then((r) => r.json())
      .then((d) => {
        setTemperature(String(d.temperature ?? 0.4));
        setBurstDelay(String(d.burstDelayMs ?? 12000));
        setMaxHistory(String(d.maxHistory ?? 20));
        setModel(d.openaiModel || "gpt-4o-mini");
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    try {
      await fetch("/api/settings/prompt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      await fetch("/api/settings/agent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temperature: parseFloat(temperature),
          burstDelayMs: parseInt(burstDelay),
          maxHistory: parseInt(maxHistory),
          openaiModel: model,
        }),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Error guardando config:", err);
    }
  };

  return (
    <aside className="w-80 border-l border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-y-auto shrink-0">
      <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Configuracion del Agente</h2>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium">System Prompt</label>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={12}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50 resize-none font-mono" />
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Temperatura</label>
            <input type="number" value={temperature} onChange={(e) => setTemperature(e.target.value)} step="0.1" min="0" max="2"
              className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Delay Anti-rafaga (ms)</label>
            <input type="number" value={burstDelay} onChange={(e) => setBurstDelay(e.target.value)} step="1000" min="3000"
              className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Max Historial</label>
            <input type="number" value={maxHistory} onChange={(e) => setMaxHistory(e.target.value)} step="5" min="5" max="100"
              className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Modelo OpenAI</label>
            <select value={model} onChange={(e) => setModel(e.target.value)}
              className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50">
              <option value="gpt-4o-mini">GPT-4o-mini</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>
        </div>

        <button onClick={handleSave}
          className="w-full py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-all font-medium">
          {saved ? "Guardado!" : "Guardar Cambios"}
        </button>
      </div>
    </aside>
  );
}
