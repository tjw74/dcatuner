import Image from "next/image";
import { Settings, Crown, ChevronRight } from "lucide-react";

const GRAFANA_BLUE = "#0094FF";
const LIGHTER_BLACK = "#181A20";

const mockTopPerformer = {
  metric: "MVRV Ratio",
  model: "Softmax",
  profit: 128,
};

const mockMetricModels = [
  { metric: "Mayer Multiple", model: "Softmax", profit: 102 },
  { metric: "Realized Cap", model: "Softmax", profit: 97 },
  { metric: "Vaulted Price", model: "Softmax", profit: 85 },
  { metric: "True Market Mean", model: "Softmax", profit: 80 },
  { metric: "200d SMA", model: "Softmax", profit: 75 },
];

function TopPerformerCard({ metric, model, profit }: typeof mockTopPerformer) {
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

function MetricModelRow({ metric, model, profit, rank }: typeof mockMetricModels[0] & { rank: number }) {
  return (
    <div className="w-full flex items-center py-3 px-3 rounded-xl mb-3 border shadow-sm relative min-h-[56px]"
      style={{
        background: LIGHTER_BLACK,
        borderColor: GRAFANA_BLUE,
      }}
    >
      {/* Centered rank badge in left margin */}
      <div className="flex items-center h-full absolute left-2 top-0 bottom-0">
        <span className="flex items-center justify-center text-base font-bold text-white opacity-40 w-7 h-7 rounded-full bg-transparent select-none">{rank}</span>
      </div>
      {/* Main content, nudged left to make room for badge */}
      <div className="flex flex-row items-center w-full pl-8">
        <div className="flex-1">
          <div className="text-white text-base font-semibold truncate">{metric} <span className="text-slate-400 font-normal">+ {model}</span></div>
        </div>
        <div className="text-blue-300 font-bold text-lg mr-2 whitespace-nowrap">+{profit}%</div>
        <ChevronRight className="text-slate-500 w-5 h-5 ml-1" />
      </div>
    </div>
  );
}

export default function Home() {
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
        <TopPerformerCard {...mockTopPerformer} />
        <div className="w-full flex flex-col gap-2">
          {mockMetricModels.slice(0, 4).map((row, i) => (
            <MetricModelRow key={i} {...row} rank={i + 2} />
          ))}
        </div>
      </main>
    </div>
  );
}
