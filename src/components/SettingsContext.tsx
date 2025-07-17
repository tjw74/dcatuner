"use client";
import React, { createContext, useState, useContext } from 'react';

export type Settings = {
  dcaTimeFrame: string;
  dailyBudget: number;
  totalBudget: number;
  softmaxTemperature: number;
  zScoreRange: string;
};

const defaultSettings: Settings = {
  dcaTimeFrame: '2yr',
  dailyBudget: 10,
  totalBudget: 3650,
  softmaxTemperature: 1.0,
  zScoreRange: '4yr',
};

export const SettingsContext = createContext<{
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
} | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
} 