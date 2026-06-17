"use client";

interface Props {
  categories: string[];
  active: string;
  onChange: (cat: string) => void;
}

export default function CategoryTabs({ categories, active, onChange }: Props) {
  if (categories.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto py-4 mb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0" id="menu">
      <button
        onClick={() => onChange("")}
        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
          active === ""
            ? "bg-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-primary)]/20"
            : "bg-white border border-[var(--brand-border)] text-[var(--brand-text-secondary)] hover:border-[var(--brand-primary-light)]"
        }`}
      >
        Todo
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            active === cat
              ? "bg-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-primary)]/20"
              : "bg-white border border-[var(--brand-border)] text-[var(--brand-text-secondary)] hover:border-[var(--brand-primary-light)]"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
