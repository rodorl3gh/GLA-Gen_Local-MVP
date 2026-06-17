"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  conversationId: number | null;
  conversationMode: "AI" | "HUMAN";
  phone: string | null;
  messages: any[];
  onSendManual: (text: string) => void;
  onToggleMode: () => void;
  onDeleteConversation: () => void;
  onRefresh: () => void;
  onOpenConfig: () => void;
}

export default function ChatPanel({
  conversationId,
  conversationMode,
  phone,
  messages,
  onSendManual,
  onToggleMode,
  onDeleteConversation,
  onRefresh,
  onOpenConfig,
}: Props) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !conversationId) return;
    onSendManual(input.trim());
    setInput("");
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Selecciona una conversacion para ver los mensajes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div>
          <h2 className="text-sm font-medium text-[var(--text-primary)]">
            {phone || "Desconocido"}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                conversationMode === "AI"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-yellow-500/20 text-yellow-400"
              }`}
            >
              {conversationMode}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onToggleMode} className="px-2 py-1 text-[11px] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
            {conversationMode === "AI" ? "Modo Humano" : "Modo IA"}
          </button>
          <button onClick={onOpenConfig} className="px-2 py-1 text-[11px] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
            Config
          </button>
          <button onClick={onDeleteConversation} className="px-2 py-1 text-[11px] bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors">
            Eliminar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-[var(--text-muted)] py-8">
            Sin mensajes todavia
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                msg.role === "user"
                  ? "bg-emerald-600 text-white rounded-br-md"
                  : msg.role === "human"
                  ? "bg-yellow-600/20 text-yellow-300 border border-yellow-500/20 rounded-bl-md"
                  : "bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-bl-md"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              <p className="text-[10px] opacity-50 mt-1">
                {new Date(msg.created_at * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={conversationMode === "HUMAN" ? "Escribe como humano..." : "Enviar mensaje manual..."}
            className="flex-1 px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500/50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all font-medium"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
