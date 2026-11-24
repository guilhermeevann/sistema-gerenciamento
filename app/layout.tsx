import type { Metadata } from "next";
import { Geist_Mono, Inter, Sora } from "next/font/google";
import "./globals.css";

// Mesma tipografia do CRM da Workflow.ia: Inter no texto, Sora em títulos e botões, Geist Mono em rótulos.
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter" });
const sora = Sora({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-sora" });
const geistMono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  // Cada seção define o próprio título (layout.tsx da pasta); a aba mostra "Seção · Rotina".
  title: { default: "Rotina", template: "%s · Rotina" },
  description: "Gestão pessoal: rotina, estudos, marcos e planejamento do ano.",
};

import Sidebar from "@/components/Sidebar";
import ToastContainer from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { themeScript } from "@/lib/theme";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // data-theme é corrigido pelo script inline antes da pintura; por isso suppressHydrationWarning.
    <html lang="pt-BR" className={`${inter.variable} ${sora.variable} ${geistMono.variable}`} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
        <div className="app-container">
          <Sidebar />
          <main id="conteudo" className="main-content" tabIndex={-1}>
            {children}
          </main>
        </div>
        <ToastContainer />
        <ConfirmDialog />
      </body>
    </html>
  );
}
