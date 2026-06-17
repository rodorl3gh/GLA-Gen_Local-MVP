"use client";

interface Props {
  cartCount: number;
  onCartClick: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  cartHighlight?: boolean;
}

export default function Header({ cartCount, onCartClick, search, onSearchChange, cartHighlight }: Props) {
  return (
    <header className="sticky top-0 z-40 bg-[var(--brand-bg)]/80 backdrop-blur-lg border-b border-[var(--brand-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center text-white font-semibold text-sm">
            L
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--brand-text)]">Cafeteria Luna Test</h1>
            <p className="text-[10px] text-[var(--brand-text-muted)]">Cafe de especialidad</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center bg-white border border-[var(--brand-border)] rounded-xl px-3 py-1.5 gap-2">
            <svg className="w-4 h-4 text-[var(--brand-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar producto..."
              className="text-sm bg-transparent outline-none w-40 text-[var(--brand-text)] placeholder-[var(--brand-text-muted)]"
            />
          </div>

          <button
            onClick={onCartClick}
            className={`relative p-2 rounded-xl transition-all duration-300 ${
              cartHighlight
                ? "bg-[var(--brand-primary)]/15 scale-110"
                : "hover:bg-white/50"
            }`}
          >
            <svg className={`w-5 h-5 transition-colors duration-300 ${cartHighlight ? "text-[var(--brand-primary)]" : "text-[var(--brand-text)]"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            {cartCount > 0 && (
              <span className={`absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center transition-all duration-300 ${
                cartHighlight ? "bg-[var(--brand-primary)] scale-110" : "bg-[var(--brand-primary)]"
              }`}>
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
