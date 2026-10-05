import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema de Rotina",
  description: "Gerenciamento pessoal de rotina, estudos e metas.",
};

import Sidebar from "@/components/Sidebar";
import ToastContainer from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        <div className="app-container">
          <Sidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
        <ToastContainer />
        <ConfirmDialog />
      </body>
    </html>
  );
}
