import type { Metadata } from "next";

export const metadata: Metadata = { title: "Planejamento do ano" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
