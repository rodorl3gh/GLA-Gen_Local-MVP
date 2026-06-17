"use client";

interface Props {
  conversations: any[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onRefresh: () => void;
  activeTab: string;
  onTabChange: (tab: "chat" | "catalog" | "orders") => void;
}

export default function Sidebar({
  conversations,
  selectedId,
  onSelect,
  onRefresh,
  activeTab,
  onTabChange,
}: Props) {
  const tabs = [
    { key: "chat", label: "Chats" },
    { key: "catalog", label: "Catalogo" },
    { key: "orders", label: "Pedidos" },
  ];

  return (
    <aside className="w-72 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col shrink-0">
      <div className="p-4 border-b border-[var(--border-color)]">
        <h1 className="text-sm font-semibold text-white mb-3">
          Luna
        </h1>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key as any)}
              className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                activeTab === tab.key
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "chat" && (
        <>
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-medium">
              Conversaciones
            </span>
            <button
              onClick={onRefresh}
              className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && (
              <p className="text-center text-xs text-[var(--text-muted)] py-8 px-4">
                Aun no hay conversaciones. Cuando alguien envie un mensaje aparecera aqui.
              </p>
            )}
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`w-full text-left px-4 py-3 border-b border-[var(--border-color)] transition-colors ${
                  selectedId === conv.id
                    ? "bg-emerald-500/10 border-l-2 border-l-emerald-500"
                    : "hover:bg-[var(--bg-hover)]"
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {conv.name || conv.phone}
                  </span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      conv.mode === "HUMAN" ? "bg-yellow-500" : "bg-emerald-500"
                    }`}
                  />
                </div>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {conv.last_message || "Sin mensajes"}
                </p>
              </button>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
