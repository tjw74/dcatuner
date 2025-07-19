"use client";
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useSettings, Settings } from './SettingsContext';

export default function GlobalMenu() {
  const [showMenu, setShowMenu] = useState(false);
  const { settings, setSettings } = useSettings();

  const handleSettingChange = (key: keyof Settings, value: string | number) => {
    setSettings((prev: Settings) => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setShowMenu(true)}
          className="p-2 rounded-full hover:bg-[#222] transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6 text-[#aaa]" />
        </button>
      </div>
      {showMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-start justify-end" onClick={() => setShowMenu(false)}>
          <div className="bg-black border-l border-gray-700 rounded-l-xl p-8 w-full max-w-xs shadow-2xl animate-slideInRight h-full flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Menu</h2>
              <button onClick={() => setShowMenu(false)} className="p-1 hover:bg-gray-800 rounded">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            {/* Navigation Section */}
            <div className="mb-4">
              <div className="text-xs uppercase text-gray-500 mb-2 tracking-widest">Navigation</div>
              <Link href="/" className="block w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white hover:bg-gray-700 mb-2 text-center" onClick={() => setShowMenu(false)}>
                Home
              </Link>
              <Link href="/charts" className="block w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white hover:bg-gray-700 text-center" onClick={() => setShowMenu(false)}>
                Chart Verification
              </Link>
            </div>
            <div className="border-t border-gray-700 my-4" />
            {/* Settings Section */}
            <div className="mb-2 flex-1 overflow-y-auto">
              <div className="text-xs uppercase text-gray-500 mb-2 tracking-widest">Settings</div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">DCA Time Frame</label>
                <select
                  value={settings.dcaTimeFrame}
                  onChange={e => handleSettingChange('dcaTimeFrame', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="2yr">2 Years</option>
                  <option value="4yr">4 Years</option>
                  <option value="8yr">8 Years</option>
                  <option value="all">All Time</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">Daily DCA Budget ($)</label>
                <input
                  type="number"
                  value={settings.dailyBudget}
                  onChange={e => handleSettingChange('dailyBudget', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  min="0"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">Total DCA Budget ($)</label>
                <input
                  type="number"
                  value={settings.totalBudget}
                  onChange={e => handleSettingChange('totalBudget', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  min="0"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">Softmax Sensitivity (Temperature)</label>
                <input
                  type="number"
                  value={settings.softmaxTemperature}
                  onChange={e => handleSettingChange('softmaxTemperature', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  min="0.01"
                  step="0.01"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">Z-Score Time Range</label>
                <select
                  value={settings.zScoreRange}
                  onChange={e => handleSettingChange('zScoreRange', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="2yr">2 Years</option>
                  <option value="4yr">4 Years</option>
                  <option value="8yr">8 Years</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>
            <div className="border-t border-gray-700 my-4" />
            {/* Integrations Section (future) */}
            <div className="mb-2">
              <div className="text-xs uppercase text-gray-500 mb-2 tracking-widest">Integrations</div>
              <div className="text-gray-400 text-sm">Coming soon: Connect your exchange or broker</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 