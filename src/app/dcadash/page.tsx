"use client";
import Image from "next/image";
import { Menu } from "lucide-react";

export default function DCADashPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center font-sans">
      {/* Header */}
      <header className="w-full flex items-center justify-between px-4 py-4 border-b border-[#222]">
        <div className="flex items-center gap-2">
          <Image
            src="/clarion_chain_logo.png"
            alt="Clarion Chain Logo"
            width={24}
            height={24}
            className="object-contain"
            style={{ height: "1.5rem", width: "auto" }}
            priority
          />
          <span className="text-xl font-bold tracking-tight leading-none" style={{ lineHeight: "2rem" }}>
            DCA Verification
          </span>
        </div>
        <button
          className="p-2 rounded-full hover:bg-[#222] transition-colors"
          onClick={() => window.location.href = '/'}
          aria-label="Back to Home"
        >
          <Menu className="w-6 h-6 text-[#aaa]" />
        </button>
      </header>
      <main className="w-full max-w-md flex flex-col items-center px-2 mt-12">
        <h1 className="text-3xl font-bold">DCA Verification</h1>
      </main>
    </div>
  );
} 