import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Menú Digital | Cafeteria Luna Test",
  description: "Explora nuestro menú y ordena directamente vía WhatsApp",
};

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
