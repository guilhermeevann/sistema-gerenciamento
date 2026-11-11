import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Cada seção define o próprio título (layout.tsx da pasta); a aba mostra "Seção · Rotina".
  title: { default: "Rotina", template: "%s · Rotina" },
  description: "Gerenciamento pessoal de rotina, estudos, planejamento do ano e conteúdo.",
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
    <html lang="pt-BR" className={inter.variable} data-theme="dark" suppressHydrationWarning>
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
