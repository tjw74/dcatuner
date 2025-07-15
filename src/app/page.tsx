"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Settings, Crown, ChevronRight } from "lucide-react";
import { fetchAllMetrics } from "@/datamanager/fetchMetrics";
import { calculateDerivedMetrics } from "@/datamanager/derivedMetrics";
import { calculateZScores, Z_SCORE_WINDOWS } from "@/datamanager/zScore";
import { calculateRegularDCA, calculateTunedDCA, softmaxModel } from "@/datamanager/dca";
import { METRICS_LIST, DERIVED_METRICS } from "@/datamanager/metricsConfig";

const GRAFANA_BLUE = "#0094FF";
const LIGHTER_BLACK = "#181A20";
const API_BASE = "https://bitcoinresearchkit.org";
const DCA_BUDGET = 10; // $10/day
const WINDOW = Z_SCORE_WINDOWS["4yr"];

function TopPerformerCard({ metric, model, profit }: { metric: string; model: string; profit: number }) {
  return (
    <div className="w-full rounded-2xl flex items-center p-5 mb-8 border shadow-lg relative"
      style={{
        background: `linear-gradient(120deg, ${GRAFANA_BLUE} 0%, #000 100%)`,
        borderColor: GRAFANA_BLUE,
      }}
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
      <ChevronRight className="text-blue-200 w-7 h-7 absolute right-4 top-1/2 -translate-y-1/2" />
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
  // Direct API fetch test for 'close' metric, store in state for UI display
  const [closeSample, setCloseSample] = useState<number[] | null>(null);
  const [dcaDebug, setDcaDebug] = useState<any>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    async function testFetchClose() {
      const url = "https://bitcoinresearchkit.org/api/vecs/dateindex-to-close?from=-10000";
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (Array.isArray(data)) {
          setCloseSample(data.slice(-10));
          // DCA debug
          const WINDOW = 1460; // 4yr
          const priceWindow = data.slice(-WINDOW);
          // Use the same DCA logic as in the main code
          const regDca = priceWindow.map((price) => (price > 0 ? 10 / price : 0));
          // Fake z-scores for now
          const z = Array(priceWindow.length).fill(0);
          const tunedDca = priceWindow.map((price, i) => (price > 0 ? 10 / price : 0));
          setDcaDebug({
            WINDOW,
            priceWindowLen: priceWindow.length,
            regDca: regDca.slice(0, 10),
            tunedDca: tunedDca.slice(0, 10),
            regDcaNonZero: regDca.filter((x) => x > 0).length,
            tunedDcaNonZero: tunedDca.filter((x) => x > 0).length,
          });
        }
      } catch (e) {
        setCloseSample([-1]);
      }
    }
    testFetchClose();
  }, []);

  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainCalcDebug, setMainCalcDebug] = useState<any>(null);
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      // 1. Fetch all metrics
      const raw = await fetchAllMetrics();
      // 2. Compute derived metrics
      const derived = calculateDerivedMetrics(raw);
      // 3. Merge all metrics
      const allMetrics: Record<string, number[]> = { ...raw, ...derived };
      // 4. Prepare results for each metric+model (softmax only for now)
      const price = allMetrics["close"];
      const n = price?.length || 0;
      const resultsArr: any[] = [];
      Object.entries(allMetrics).forEach(([metric, data]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        // Align data to length n (pad start with NaN if needed)
        let aligned = data.length === n ? data : Array(n - data.length).fill(NaN).concat(data.slice(-n));
        // Calculate z-scores
        const z = calculateZScores(aligned, WINDOW);
        // Regular DCA
        const regDca = calculateRegularDCA(price, DCA_BUDGET, WINDOW);
        const regBtc = regDca.reduce((a, b) => a + b, 0);
        const priceWindow = price.slice(-WINDOW);
        // Tuned DCA
        const tunedDca = calculateTunedDCA(price, z, DCA_BUDGET, WINDOW, softmaxModel);
        const tunedBtc = tunedDca.reduce((a, b) => a + b, 0);
        const currentPrice = priceWindow[priceWindow.length - 1];
        const regUsd = regBtc * currentPrice;
        const tunedUsd = tunedBtc * currentPrice;
        // Profits
        const profit = Math.round(((tunedUsd - DCA_BUDGET * WINDOW) / (DCA_BUDGET * WINDOW)) * 100);
        const regProfit = Math.round(((regUsd - DCA_BUDGET * WINDOW) / (DCA_BUDGET * WINDOW)) * 100);
        const outperf = profit - regProfit;
        const btcOutperf = Math.round(((tunedBtc - regBtc) / regBtc) * 100);
        if (metric === "close") {
          setMainCalcDebug({
            priceWindow: priceWindow.slice(0, 10),
            regDca: regDca.slice(0, 10),
            tunedDca: tunedDca.slice(0, 10),
            regUsd,
            tunedUsd,
            profit,
          });
        }
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
  }, []);

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
            DCA Tuner
          </span>
        </div>
        <button className="p-2 rounded-full hover:bg-[#222] transition-colors">
          <Settings className="w-6 h-6 text-[#aaa]" />
        </button>
      </header>
      <main className="w-full max-w-md flex flex-col items-center px-2 mt-4">
        {/* Debug: Show close metric sample */}
        {closeSample && (
          <div className="text-xs text-blue-300 mb-2 w-full text-center">
            close metric sample: {JSON.stringify(closeSample)}
          </div>
        )}
        {dcaDebug && (
          <div className="text-xs text-yellow-300 mb-2 w-full text-center">
            WINDOW: {dcaDebug.WINDOW}, priceWindowLen: {dcaDebug.priceWindowLen}<br />
            regDca: {JSON.stringify(dcaDebug.regDca)}<br />
            tunedDca: {JSON.stringify(dcaDebug.tunedDca)}<br />
            regDcaNonZero: {dcaDebug.regDcaNonZero}, tunedDcaNonZero: {dcaDebug.tunedDcaNonZero}
          </div>
        )}
        {mainCalcDebug && (
          <div className="text-xs text-pink-300 mb-2 w-full text-center">
            <b>Main calc debug (close):</b><br />
            priceWindow: {JSON.stringify(mainCalcDebug.priceWindow)}<br />
            regDca: {JSON.stringify(mainCalcDebug.regDca)}<br />
            tunedDca: {JSON.stringify(mainCalcDebug.tunedDca)}<br />
            regUsd: {mainCalcDebug.regUsd}, tunedUsd: {mainCalcDebug.tunedUsd}, profit: {mainCalcDebug.profit}
          </div>
        )}
        {loading ? (
          <div className="text-center text-blue-200 py-10">Loading results…</div>
        ) : (
          <>
            {results.length > 0 && (
              <TopPerformerCard
                metric={results[0].metric}
                model={results[0].model}
                profit={results[0].profit}
              />
            )}
            <div className="w-full flex flex-col gap-2">
              {results.slice(1, 5).map((row, i) => (
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
