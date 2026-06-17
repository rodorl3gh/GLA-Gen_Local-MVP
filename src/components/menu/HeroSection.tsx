export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#c07a5b]/10 via-[var(--brand-bg)] to-[#c07a5b]/5 border-b border-[var(--brand-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-2xl">
          <span className="inline-block px-3 py-1 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-xs font-medium mb-4">
            Café de especialidad
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--brand-text)] leading-tight mb-4">
            Cada taza cuenta{" "}
            <span className="text-[var(--brand-primary)]">una historia</span>
          </h1>
          <p className="text-base sm:text-lg text-[var(--brand-text-secondary)] leading-relaxed max-w-xl">
            Explora nuestro menú de cafés de especialidad, tés artesanales y repostería
            recién horneada. Ordena directo a WhatsApp y te lo llevamos.
          </p>
          <div className="flex items-center gap-4 mt-6">
            <a href="#menu" className="btn-primary">
              Ver Menú
            </a>
            <span className="text-sm text-[var(--brand-text-muted)]">
              o escanea nuestro QR en mesa
            </span>
          </div>
        </div>
      </div>

      <div className="absolute right-0 top-0 w-1/3 h-full hidden lg:block opacity-10">
        <svg viewBox="0 0 200 200" className="w-full h-full text-[var(--brand-primary)]">
          <circle cx="100" cy="100" r="80" fill="currentColor" />
          <circle cx="100" cy="100" r="60" fill="none" stroke="white" strokeWidth="2" strokeDasharray="8 4" />
          <circle cx="100" cy="100" r="40" fill="none" stroke="white" strokeWidth="1" />
        </svg>
      </div>
    </section>
  );
}
