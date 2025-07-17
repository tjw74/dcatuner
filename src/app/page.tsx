"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Menu, Crown, ChevronRight, X } from "lucide-react";
import { fetchAllMetrics } from "@/datamanager";
import { calculateDerivedMetrics } from "@/datamanager/derivedMetrics";
import { calculateZScores, Z_SCORE_WINDOWS } from "@/datamanager/zScore";
import { calculateRegularDCA, calculateTunedDCA, softmaxModel } from "@/datamanager/dca";
import { METRICS_LIST, DERIVED_METRICS } from "@/datamanager/metricsConfig";

const GRAFANA_BLUE = "#0094FF";
const LIGHTER_BLACK = "#181A20";
const DCA_BUDGET = 10; // $10/day

// Settings menu component
function SettingsMenu({ isOpen, onClose, settings, onSettingsChange }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-16">
      <div className="bg-black border border-gray-700 rounded-lg p-6 w-80 max-w-[90vw] shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <div className="space-y-6">
          {/* DCA Time Range */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">DCA Time Range</label>
            <select
              value={settings.dcaTimeRange}
              onChange={(e) => onSettingsChange({ ...settings, dcaTimeRange: e.target.value })}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="2yr">2 Years</option>
              <option value="4yr">4 Years</option>
              <option value="8yr">8 Years</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Z Score Mean Range */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Z Score Mean Range</label>
            <select
              value={settings.zScoreRange}
              onChange={(e) => onSettingsChange({ ...settings, zScoreRange: e.target.value })}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="2yr">2 Years</option>
              <option value="4yr">4 Years</option>
              <option value="8yr">8 Years</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Softmax Alpha Sensitivity */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Softmax Alpha Sensitivity ({settings.softmaxAlpha})
            </label>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={settings.softmaxAlpha}
              onChange={(e) => onSettingsChange({ ...settings, softmaxAlpha: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0.1 (Extreme)</span>
              <span>3.0 (Uniform)</span>
            </div>
          </div>

          {/* Data Source */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Data Source</label>
            <select
              value={settings.dataSource}
              onChange={(e) => onSettingsChange({ ...settings, dataSource: e.target.value })}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="https://bitcoinresearchkit.org">bitcoinresearchkit.org</option>
              <option value="https://brk.openonchain.dev">brk.openonchain.dev</option>
            </select>
          </div>

          {/* Data Verification Charts */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Data Verification</label>
            <a
              href="/charts"
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white hover:bg-gray-700 flex items-center justify-center focus:outline-none focus:border-blue-500"
            >
              View Charts
            </a>
          </div>

          <button
            className="w-full mt-4 bg-neutral-900 text-white border border-neutral-700 rounded px-4 py-2 hover:bg-neutral-800 transition"
            onClick={() => window.location.href = '/dcadash'}
          >
            DCA Verification
          </button>
        </div>
      </div>
    </div>
  );
}

function TopPerformerCard({ metric, model, profit, btc, outperf, regProfit, regBtc, btcOutperf, expanded, onClick }: any) {
  return (
    <div className="w-full rounded-2xl mb-8 border shadow-lg relative overflow-hidden"
      style={{
        background: `linear-gradient(120deg, ${GRAFANA_BLUE} 0%, #000 100%)`,
        borderColor: GRAFANA_BLUE,
      }}
    >
      <button
        className="flex items-center w-full p-5 focus:outline-none"
        onClick={onClick}
        aria-expanded={expanded}
      >
        <div className="flex flex-col items-center justify-center mr-5">
          <span className="text-4xl font-extrabold text-white opacity-60 select-none leading-none">1</span>
          <Crown className="text-yellow-400 w-10 h-10 mt-1 drop-shadow-lg" />
        </div>
        <div className="flex-1">
          <div className="text-4xl font-extrabold text-white drop-shadow">+{profit}%</div>
          <div className="text-xs text-blue-100 mt-1 uppercase tracking-widest font-semibold">Most Profitable</div>
          <div className="text-lg text-white mt-2 font-medium">{metric} <span className="text-blue-200 font-normal">+ {model}</span></div>
        </div>
        <ChevronRight className={`text-blue-200 w-7 h-7 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      <div
        className={`transition-all duration-300 ease-in-out bg-[#0a0a0a] px-6 ${expanded ? 'max-h-40 py-4 opacity-100' : 'max-h-0 py-0 opacity-0'} overflow-hidden`}
        style={{ borderTop: expanded ? `1px solid ${GRAFANA_BLUE}` : 'none' }}
      >
        {/* Three short columns: Tuned, Out Perf., DCA */}
        <div className="flex flex-row gap-6 text-sm">
          {/* Tuned */}
          <div className="flex-1 min-w-0 text-center">
            <div className="font-semibold text-blue-200 mb-1">Tuned</div>
            <div className="text-green-400 font-bold">+{profit}%</div>
            <div className="text-yellow-300 font-bold">{btc} BTC</div>
          </div>
          {/* Out Perf. */}
          <div className="flex-1 min-w-0 text-center">
            <div className="font-semibold text-blue-200 mb-1">Out Perf.</div>
            <div className="text-blue-400 font-bold">+{outperf}%</div>
            <div className="text-yellow-400 font-bold">+{btcOutperf}% BTC</div>
          </div>
          {/* DCA */}
          <div className="flex-1 min-w-0 text-center">
            <div className="font-semibold text-blue-200 mb-1">DCA</div>
            <div className="text-gray-300 font-bold">+{regProfit}%</div>
            <div className="text-gray-400 font-bold">{regBtc} BTC</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricModelRow({ metric, model, profit, btc, outperf, regProfit, regBtc, btcOutperf, rank, expanded, onClick }: any) {
  return (
    <div className="w-full mb-3 rounded-xl border shadow-sm relative min-h-[56px] overflow-hidden"
      style={{ background: LIGHTER_BLACK, borderColor: GRAFANA_BLUE }}
    >
      <button
        className="flex items-center w-full py-3 px-3 focus:outline-none"
        style={{ minHeight: 56 }}
        onClick={onClick}
        aria-expanded={expanded}
      >
        <div className="flex flex-row items-center w-full">
          <span className="flex items-center justify-center text-base font-bold text-white opacity-40 w-7 h-7 rounded-full bg-transparent select-none mr-2">{rank}</span>
          <div className="flex-1 text-left">
            <div className="text-white text-base font-semibold">{metric} <span className="text-slate-400 font-normal">+ {model}</span></div>
          </div>
          <div className="text-blue-300 font-bold text-lg mr-2 whitespace-nowrap">+{profit}%</div>
          <ChevronRight className={`text-slate-500 w-5 h-5 ml-1 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>
      <div
        className={`transition-all duration-300 ease-in-out bg-[#101217] px-6 ${expanded ? 'max-h-40 py-4 opacity-100' : 'max-h-0 py-0 opacity-0'} overflow-hidden`}
        style={{ borderTop: expanded ? `1px solid ${GRAFANA_BLUE}` : 'none' }}
      >
        {/* Three short columns: Tuned, Out Perf., DCA */}
        <div className="flex flex-row gap-6 text-sm">
          {/* Tuned */}
          <div className="flex-1 min-w-0 text-center">
            <div className="font-semibold text-blue-200 mb-1">Tuned</div>
            <div className="text-green-400 font-bold">+{profit}%</div>
            <div className="text-yellow-300 font-bold">{btc} BTC</div>
          </div>
          {/* Out Perf. */}
          <div className="flex-1 min-w-0 text-center">
            <div className="font-semibold text-blue-200 mb-1">Out Perf.</div>
            <div className="text-blue-400 font-bold">+{outperf}%</div>
            <div className="text-yellow-400 font-bold">+{btcOutperf}% BTC</div>
          </div>
          {/* DCA */}
          <div className="flex-1 min-w-0 text-center">
            <div className="font-semibold text-blue-200 mb-1">DCA</div>
            <div className="text-gray-300 font-bold">+{regProfit}%</div>
            <div className="text-gray-400 font-bold">{regBtc} BTC</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [topCardExpanded, setTopCardExpanded] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    dcaTimeRange: '4yr',
    zScoreRange: '4yr',
    softmaxAlpha: 1.0,
    dataSource: 'https://bitcoinresearchkit.org'
  });
  
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      // Get window sizes from settings
      const dcaWindow = Z_SCORE_WINDOWS[settings.dcaTimeRange as keyof typeof Z_SCORE_WINDOWS];
      const zScoreWindow = Z_SCORE_WINDOWS[settings.zScoreRange as keyof typeof Z_SCORE_WINDOWS];
      
      // 1. Fetch all metrics
      const metricData = await fetchAllMetrics(settings.dataSource);
      // 2. Compute derived metrics
      const derived = calculateDerivedMetrics(metricData.metrics);
      // 3. Merge all metrics
      const allMetrics: Record<string, number[]> = { ...metricData.metrics, ...derived };
      // 4. Prepare results for each metric+model (softmax only for now)
      const price = allMetrics["close"];
      const n = price?.length || 0;
      const resultsArr: any[] = [];
      Object.entries(allMetrics).forEach(([metric, data]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        
        // All metrics are now guaranteed to be aligned by the API
        // No manual padding needed - data is already properly aligned
        const metricData = data;
        
        // Calculate z-scores using the z-score window setting
        const z = calculateZScores(metricData, zScoreWindow);
        // Regular DCA using the DCA window setting
        const regDca = calculateRegularDCA(price, DCA_BUDGET, dcaWindow);
        const regBtc = regDca.reduce((a, b) => a + b, 0);
        const priceWindow = price.slice(-dcaWindow);
        // Tuned DCA using the DCA window setting and softmax alpha from settings
        const tunedDca = calculateTunedDCA(price, z, DCA_BUDGET, dcaWindow, softmaxModel, settings.softmaxAlpha);
        const tunedBtc = tunedDca.reduce((a, b) => a + b, 0);
        const currentPrice = priceWindow[priceWindow.length - 1];
        const regUsd = regBtc * currentPrice;
        const tunedUsd = tunedBtc * currentPrice;
        
        // Profits - with division by zero protection
        // Protects against DCA_BUDGET = 0 (totalInvestment = 0) and regBtc = 0 scenarios
        const totalInvestment = DCA_BUDGET * dcaWindow;
        const profit = totalInvestment > 0 
          ? Math.round(((tunedUsd - totalInvestment) / totalInvestment) * 100)
          : 0;
        const regProfit = totalInvestment > 0 
          ? Math.round(((regUsd - totalInvestment) / totalInvestment) * 100)
          : 0;
        const outperf = profit - regProfit;
        const btcOutperf = regBtc > 0 
          ? Math.round(((tunedBtc - regBtc) / regBtc) * 100)
          : 0;
        
        resultsArr.push({
          metric,
          model: "Softmax",
          profit,
          btc: tunedBtc.toFixed(3),
          outperf,
          regProfit,
          regBtc: regBtc.toFixed(3),
          btcOutperf,
        });
      });
      // Sort by profit descending
      resultsArr.sort((a, b) => b.profit - a.profit);
      setResults(resultsArr);
      setLoading(false);
    }
    loadData();
  }, [settings]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center font-sans">
      <SettingsMenu
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />
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
            DCA Tuner
          </span>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-full hover:bg-[#222] transition-colors"
        >
          <Menu className="w-6 h-6 text-[#aaa]" />
        </button>
      </header>
      <main className="w-full max-w-md flex flex-col items-center px-2 mt-4">
        {loading ? (
          <div className="text-center text-blue-200 py-10">Loading results…</div>
        ) : (
          <>
            {results.length > 0 && (
              <TopPerformerCard
                {...results[0]}
                expanded={topCardExpanded}
                onClick={() => setTopCardExpanded(!topCardExpanded)}
              />
            )}
            <div className="w-full flex flex-col gap-2">
              {results.slice(1).map((row, i) => (
                <MetricModelRow
                  key={row.metric}
                  {...row}
                  rank={i + 2}
                  expanded={expandedIdx === i}
                  onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
