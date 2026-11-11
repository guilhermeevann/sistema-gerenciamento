import type { Metadata } from "next";

export const metadata: Metadata = { title: "Linha do tempo" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
