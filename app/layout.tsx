'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { useState } from 'react';
import { HistoryProvider } from "@/app/context/HistoryContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
      <html lang="es" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-800 min-h-screen flex flex-col`}>
      <HistoryProvider>

        <header className="bg-white border-b border-slate-200 px-6 sm:px-8 py-4 flex justify-between items-center shrink-0 z-20 relative">
          <div className="flex items-center gap-4">
            <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden flex flex-col justify-center items-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-slate-600 focus:outline-none"
                aria-label="Abrir menú"
            >
              <span className={`block w-5 h-0.5 bg-current transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1' : '-translate-y-0.5'}`}></span>
              <span className={`block w-5 h-0.5 bg-current transition-all duration-300 my-0.5 ${isMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
              <span className={`block w-5 h-0.5 bg-current transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-1' : 'translate-y-0.5'}`}></span>
            </button>

            <Link href="/" onClick={() => setIsMenuOpen(false)} className="text-xl font-black text-indigo-600 tracking-tight hover:opacity-80">
              TrackBuster
            </Link>
          </div>

          <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-600">
            <Link href="/insights" className="hover:text-indigo-600 transition-colors">Resumen Musical</Link>
            <Link href="/filters" className="hover:text-indigo-600 transition-colors">Filtra tu música</Link>
          </nav>

          {isMenuOpen && (
              <div className="absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-lg md:hidden flex flex-col p-4 space-y-3 z-30 animate-in fade-in slide-in-from-top-2 duration-200">
                <Link
                    href="/insights"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 px-3 py-2 rounded-xl transition-all"
                >
                  Resumen Musical
                </Link>
                <Link
                    href="/filters"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 px-3 py-2 rounded-xl transition-all"
                >
                  Filtra tu música
                </Link>
              </div>
          )}
        </header>

        <div className="flex-1 flex overflow-hidden">
          {children}
        </div>

      </HistoryProvider>
      </body>
      </html>
  );
}