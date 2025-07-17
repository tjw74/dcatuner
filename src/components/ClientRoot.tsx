"use client";
import { SettingsProvider } from "./SettingsContext";

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
} 