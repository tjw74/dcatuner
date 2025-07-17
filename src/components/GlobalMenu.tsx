"use client";
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';

export default function GlobalMenu() {
  const [showMenu, setShowMenu] = useState(false);
  const [dcaTimeRangeKey, setDcaTimeRangeKey] = useState('2yr');
  const [zScoreRange, setZScoreRange] = useState('4yr');
  const [dataSource, setDataSource] = useState('https://bitcoinresearchkit.org');

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
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-start justify-center pt-16">
          <div className="bg-black border border-gray-700 rounded-xl p-8 w-full max-w-md shadow-2xl animate-slideDown">
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
              <Link href="/dashboard" className="block w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white hover:bg-gray-700 text-center" onClick={() => setShowMenu(false)}>
                Dashboard
              </Link>
            </div>
            <div className="border-t border-gray-700 my-4" />
            {/* Admin Section */}
            <div className="mb-4">
              <div className="text-xs uppercase text-gray-500 mb-2 tracking-widest">Admin</div>
              <Link href="/charts" className="block w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white hover:bg-gray-700 mb-2 text-center" onClick={() => setShowMenu(false)}>
                Chart Verification
              </Link>
              <Link href="/coffee-vs-bitcoin" className="block w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white hover:bg-gray-700 text-center" onClick={() => setShowMenu(false)}>
                Coffee vs. Bitcoin
              </Link>
            </div>
            <div className="border-t border-gray-700 my-4" />
            {/* Settings Section */}
            <div className="mb-2">
              <div className="text-xs uppercase text-gray-500 mb-2 tracking-widest">Settings</div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">DCA Time Range</label>
                <select
                  value={dcaTimeRangeKey}
                  onChange={e => setDcaTimeRangeKey(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="2yr">2 Years</option>
                  <option value="4yr">4 Years</option>
                  <option value="8yr">8 Years</option>
                  <option value="all">All Time</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">Z Score Mean Range</label>
                <select
                  value={zScoreRange}
                  onChange={e => setZScoreRange(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="2yr">2 Years</option>
                  <option value="4yr">4 Years</option>
                  <option value="8yr">8 Years</option>
                  <option value="all">All Time</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Data Source</label>
                <select
                  value={dataSource}
                  onChange={e => setDataSource(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="https://bitcoinresearchkit.org">bitcoinresearchkit.org</option>
                  <option value="https://brk.openonchain.dev">brk.openonchain.dev</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 