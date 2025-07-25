/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState, useCallback, useMemo, useRef, memo } from 'react';
import { fetchAllMetrics, type MetricData } from '@/datamanager';
import { METRICS_LIST, DERIVED_METRICS, getMetricDisplayName } from '@/datamanager/metricsConfig';
import { calculateZScores, Z_SCORE_WINDOWS } from '@/datamanager/zScore';
import { calculateDerivedMetrics } from '@/datamanager/derivedMetrics';
import dynamic from 'next/dynamic';
import { calculateRegularDCA, calculateTunedDCA, softmaxModel } from '@/datamanager/dca';

// Simple performance monitoring hook
function usePerformanceMonitor() {
  const [fps, setFps] = useState(0);
  const renderCountRef = useRef(0);

  // Track render count without causing loops
  renderCountRef.current++;

  // FPS counter
  useEffect(() => {
    let frames = 0;
    let lastTime = performance.now();
    
    const countFrames = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        setFps(frames);
        frames = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(countFrames);
    };
    
    const animationId = requestAnimationFrame(countFrames);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return { renderCount: renderCountRef.current, fps };
}

// Memory usage monitor
function useMemoryMonitor() {
  const [memoryUsage, setMemoryUsage] = useState<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if ('memory' in performance) {
        setMemoryUsage((performance as Performance & { 
          memory: {
            usedJSHeapSize: number;
            totalJSHeapSize: number;
            jsHeapSizeLimit: number;
          }
        }).memory);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return memoryUsage;
}

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { 
  ssr: false,
  loading: () => <div className="text-white">Loading chart...</div>
}) as any;

// Special composite chart for MVRV Ratio showing base components + derived metric
const MVRVCompositeChart = memo(function MVRVCompositeChart({
  marketCapData,
  realizedCapData,
  mvrvData,
  dates,
  timeRange,
  onTimeRangeChange
}: {
  marketCapData: { values: number[]; zScores: number[] };
  realizedCapData: { values: number[]; zScores: number[] };
  mvrvData: { values: number[]; zScores: number[] };
  dates: string[];
  timeRange: [number, number];
  onTimeRangeChange: (range: [number, number]) => void;
}) {
  // State to track trace visibility
  const [traceVisibility, setTraceVisibility] = useState<{
    marketCap: boolean;
    realizedCap: boolean;
    mvrvRatio: boolean;
    mvrvZScore: boolean;
  }>({
    marketCap: true,
    realizedCap: true,
    mvrvRatio: true,
    mvrvZScore: true,
  });

  // Memoize filtered data to avoid recalculating on every render
  const filteredData = useMemo(() => {
    const filteredDates = dates.slice(timeRange[0], timeRange[1] + 1);
    const filteredMarketCap = marketCapData.values.slice(timeRange[0], timeRange[1] + 1);
    const filteredRealizedCap = realizedCapData.values.slice(timeRange[0], timeRange[1] + 1);
    const filteredMVRV = mvrvData.values.slice(timeRange[0], timeRange[1] + 1);
    const filteredMVRVZScore = mvrvData.zScores.slice(timeRange[0], timeRange[1] + 1);
    
    // Get latest values for display
    const latestIndex = filteredMVRV.length - 1;
    const latestDate = filteredDates[latestIndex];
    const latestMVRV = filteredMVRV[latestIndex];
    const latestMVRVZScore = filteredMVRVZScore[latestIndex];
    
    const formattedMVRV = typeof latestMVRV === 'number' ? latestMVRV.toFixed(4) : 'N/A';
    const formattedMVRVZScore = typeof latestMVRVZScore === 'number' && !isNaN(latestMVRVZScore) ? 
      latestMVRVZScore.toFixed(2) : 'N/A';
    
    return {
      filteredDates,
      filteredMarketCap,
      filteredRealizedCap,
      filteredMVRV,
      filteredMVRVZScore,
      latestDate,
      formattedMVRV,
      formattedMVRVZScore
    };
  }, [marketCapData, realizedCapData, mvrvData, dates, timeRange]);
  
  const { 
    filteredDates, 
    filteredMarketCap, 
    filteredRealizedCap, 
    filteredMVRV, 
    filteredMVRVZScore,
    latestDate, 
    formattedMVRV, 
    formattedMVRVZScore 
  } = filteredData;



  // Handle plot updates (including legend clicks)
  const handleUpdate = useCallback((figure: any) => {
    if (figure && figure.data) {
      const newVisibility = {
        marketCap: figure.data[0]?.visible !== 'legendonly',
        realizedCap: figure.data[1]?.visible !== 'legendonly',
        mvrvRatio: figure.data[2]?.visible !== 'legendonly',
        mvrvZScore: figure.data[3]?.visible !== 'legendonly',
      };
      
      // Only update if visibility actually changed
      if (newVisibility.marketCap !== traceVisibility.marketCap || 
          newVisibility.realizedCap !== traceVisibility.realizedCap ||
          newVisibility.mvrvRatio !== traceVisibility.mvrvRatio ||
          newVisibility.mvrvZScore !== traceVisibility.mvrvZScore) {
        setTraceVisibility(newVisibility);
      }
    }
  }, [traceVisibility]);

  return (
    <div className="bg-black border border-gray-600 p-4 rounded-lg">
      <div className="mb-2">
        <h3 className="text-white font-semibold">
          MVRV Ratio (Composite)
          <span className="text-sm text-gray-400 ml-2">
            {latestDate}: Ratio {formattedMVRV} | Z-Score {formattedMVRVZScore}
          </span>
        </h3>
      </div>
      <Plot
        data={[
          {
            x: filteredDates,
            y: filteredMarketCap,
            type: 'scatter',
            mode: 'lines',
            name: 'Market Cap',
            line: { color: '#10b981', width: 1 },
            yaxis: 'y',
            visible: traceVisibility.marketCap ? true : 'legendonly',
          },
          {
            x: filteredDates,
            y: filteredRealizedCap,
            type: 'scatter',
            mode: 'lines',
            name: 'Realized Cap',
            line: { color: '#8b5cf6', width: 1 },
            yaxis: 'y',
            visible: traceVisibility.realizedCap ? true : 'legendonly',
          },
          {
            x: filteredDates,
            y: filteredMVRV,
            type: 'scatter',
            mode: 'lines',
            name: 'MVRV Ratio',
            line: { color: '#3b82f6', width: 1.5 },
            yaxis: 'y2',
            visible: traceVisibility.mvrvRatio ? true : 'legendonly',
          },
          {
            x: filteredDates,
            y: filteredMVRVZScore,
            type: 'scatter',
            mode: 'lines',
            name: 'MVRV Z-Score',
            line: { color: '#ef4444', width: 1 },
            yaxis: 'y2',
            visible: traceVisibility.mvrvZScore ? true : 'legendonly',
          },
        ]}
        layout={{
          width: 600,
          height: 400,
          plot_bgcolor: '#000000',
          paper_bgcolor: '#000000',
          font: { color: '#ffffff' },
          xaxis: {
            title: 'Date',
            gridcolor: '#374151',
            color: '#ffffff',
          },
          yaxis: {
            title: 'Market Value / Realized Value ($)',
            type: 'log',
            gridcolor: '#374151',
            color: '#ffffff',
            side: 'left',
          },
          yaxis2: {
            title: 'MVRV Ratio / Z-Score',
            type: 'linear',
            gridcolor: '#374151',
            color: '#ffffff',
            side: 'right',
            overlaying: 'y',
            showgrid: false,
          },
          legend: {
            orientation: 'h',
            x: 0.5,
            y: -0.1,
            xanchor: 'center',
            yanchor: 'top',
          },
          shapes: [
            {
              type: 'line',
              x0: 0,
              x1: 1,
              y0: 0,
              y1: 0,
              xref: 'paper',
              yref: 'y2',
              line: {
                color: 'rgba(255, 255, 255, 0.3)',
                width: 0.2,
                dash: 'dot',
              },
            },
          ],
          margin: { l: 60, r: 60, t: 20, b: 80 },
        }}
        config={{
          displayModeBar: false,
          staticPlot: false,
          responsive: true,
        }}
        useResizeHandler={true}
        onUpdate={handleUpdate}
      />
      <TimeRangeSlider
        min={0}
        max={dates.length - 1}
        value={timeRange}
        onChange={onTimeRangeChange}
        dates={dates}
      />
    </div>
  );
});

// Memoized chart component to prevent unnecessary re-renders
const ChartComponent = memo(function ChartComponent({
  metric,
  values,
  zScores,
  dates,
  timeRange,
  onTimeRangeChange
}: {
  metric: string;
  values: number[];
  zScores: number[];
  dates: string[];
  timeRange: [number, number];
  onTimeRangeChange: (range: [number, number]) => void;
}) {
  // State to track trace visibility
  const [traceVisibility, setTraceVisibility] = useState<{
    metric: boolean;
    zScore: boolean;
  }>({
    metric: true,
    zScore: true,
  });

  // Memoize filtered data to avoid recalculating on every render
  const filteredData = useMemo(() => {
    const filteredDates = dates.slice(timeRange[0], timeRange[1] + 1);
    const filteredValues = values.slice(timeRange[0], timeRange[1] + 1);
    const filteredZScores = zScores.slice(timeRange[0], timeRange[1] + 1);
    
    // Get latest value and date from filtered data
    const latestIndex = filteredValues.length - 1;
    const latestDate = filteredDates[latestIndex];
    
    // Format the latest value for display
    const formattedValue = typeof filteredValues[latestIndex] === 'number' ? 
      (filteredValues[latestIndex] > 1000 ? filteredValues[latestIndex].toLocaleString() : filteredValues[latestIndex].toFixed(4)) : 
      'N/A';
    
    // Format the latest z-score for display
    const formattedZScore = typeof filteredZScores[latestIndex] === 'number' && !isNaN(filteredZScores[latestIndex]) ? 
      filteredZScores[latestIndex].toFixed(2) : 
      'N/A';
    
    return {
      filteredDates,
      filteredValues,
      filteredZScores,
      latestValue: filteredValues[latestIndex],
      latestDate,
      latestZScore: filteredZScores[latestIndex],
      formattedValue,
      formattedZScore
    };
  }, [dates, values, zScores, timeRange]);
  
  const { 
    filteredDates, 
    filteredValues, 
    filteredZScores, 
    latestDate, 
    formattedValue, 
    formattedZScore 
  } = filteredData;

  // Handle plot updates (including legend clicks)
  const handleUpdate = useCallback((figure: any) => {
    if (figure && figure.data) {
      const newVisibility = {
        metric: figure.data[0]?.visible !== 'legendonly',
        zScore: figure.data[1]?.visible !== 'legendonly',
      };
      
      // Only update if visibility actually changed
      if (newVisibility.metric !== traceVisibility.metric || newVisibility.zScore !== traceVisibility.zScore) {
        setTraceVisibility(newVisibility);
      }
    }
  }, [traceVisibility]);

  return (
    <div key={metric} className="bg-black border border-gray-600 p-4 rounded-lg">
      <div className="mb-2">
        <h3 className="text-white font-semibold">
          {getMetricDisplayName(metric)}
          <span className="text-sm text-gray-400 ml-2">
            {latestDate}: {formattedValue} | Z: {formattedZScore}
          </span>
        </h3>
      </div>
      <Plot
        data={[
          {
            x: filteredDates,
            y: filteredValues,
            type: 'scatter',
            mode: 'lines',
            name: getMetricDisplayName(metric),
            line: { color: '#3b82f6', width: 1 },
            yaxis: 'y',
            visible: traceVisibility.metric ? true : 'legendonly',
          },
          {
            x: filteredDates,
            y: filteredZScores,
            type: 'scatter',
            mode: 'lines',
            name: 'Z-Score',
            line: { color: '#ef4444', width: 1 },
            yaxis: 'y2',
            visible: traceVisibility.zScore ? true : 'legendonly',
          },
        ]}
        layout={{
          width: 600,
          height: 400,
          plot_bgcolor: '#000000',
          paper_bgcolor: '#000000',
          font: { color: '#ffffff' },
          xaxis: {
            title: 'Date',
            gridcolor: '#374151',
            color: '#ffffff',
          },
          yaxis: {
            title: getMetricDisplayName(metric),
            type: 'log',
            gridcolor: '#374151',
            color: '#ffffff',
            side: 'left',
          },
          yaxis2: {
            title: 'Z-Score',
            type: 'linear',
            gridcolor: '#374151',
            color: '#ffffff',
            side: 'right',
            overlaying: 'y',
            showgrid: false,
          },
          legend: {
            orientation: 'h',
            x: 0.5,
            y: -0.1,
            xanchor: 'center',
            yanchor: 'top',
          },
          shapes: [
            {
              type: 'line',
              x0: 0,
              x1: 1,
              y0: 0,
              y1: 0,
              xref: 'paper',
              yref: 'y2',
              line: {
                color: 'rgba(255, 255, 255, 0.3)',
                width: 0.2,
                dash: 'dot',
              },
            },
          ],
          margin: { l: 60, r: 60, t: 20, b: 80 },
        }}
        config={{
          displayModeBar: false,
          staticPlot: false,
          responsive: true,
        }}
        useResizeHandler={true}
        onUpdate={handleUpdate}
      />
      <TimeRangeSlider
        min={0}
        max={dates.length - 1}
        value={timeRange}
        onChange={onTimeRangeChange}
        dates={dates}
      />
    </div>
  );
});

// Custom dual-handle range slider component
const TimeRangeSlider = memo(function TimeRangeSlider({ 
  min, 
  max, 
  value, 
  onChange, 
  dates 
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  dates: string[];
}) {
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const [tempValue, setTempValue] = useState<[number, number]>(value);
  const lastUpdateTime = useRef(0);
  
  // Update tempValue when value prop changes
  useEffect(() => {
    if (!isDragging) {
      setTempValue(value);
    }
  }, [value, isDragging]);
  
  const handleMouseDown = (handle: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(handle);
    setTempValue(value);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    const newValue = Math.round(min + percentage * (max - min));
    const clampedValue = Math.max(min, Math.min(max, newValue));
    
    let newTempValue: [number, number];
    if (isDragging === 'start') {
      newTempValue = [Math.min(clampedValue, tempValue[1]), tempValue[1]];
    } else {
      newTempValue = [tempValue[0], Math.max(clampedValue, tempValue[0])];
    }
    
    setTempValue(newTempValue);
    
    // Throttle updates to max 60fps (16ms intervals) for real-time responsiveness
    const now = Date.now();
    if (now - lastUpdateTime.current > 16) {
      onChange(newTempValue);
      lastUpdateTime.current = now;
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      onChange(tempValue); // Final update
      setIsDragging(null);
    }
  };

  // Use tempValue for smooth visual feedback, fallback to value when not dragging
  const displayValue = isDragging ? tempValue : value;
  const startPercent = ((displayValue[0] - min) / (max - min)) * 100;
  const endPercent = ((displayValue[1] - min) / (max - min)) * 100;

  return (
    <div className="mt-4 mb-2">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{dates[displayValue[0]]}</span>
        <span>{dates[displayValue[1]]}</span>
      </div>
      <div
        className="relative w-full h-6 cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Track */}
        <div className="absolute top-1/2 w-full h-0.5 bg-gray-600 transform -translate-y-1/2" />
        
        {/* Selected range */}
        <div
          className="absolute top-1/2 h-0.5 bg-gray-600 transform -translate-y-1/2"
          style={{
            left: `${startPercent}%`,
            width: `${endPercent - startPercent}%`
          }}
        />
        
        {/* Start handle */}
        <div
          className="absolute top-1/2 w-3 h-3 bg-white border-2 border-gray-600 rounded-full transform -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform"
          style={{ left: `${startPercent}%`, marginLeft: '-6px' }}
          onMouseDown={handleMouseDown('start')}
        />
        
        {/* End handle */}
        <div
          className="absolute top-1/2 w-3 h-3 bg-white border-2 border-gray-600 rounded-full transform -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform"
          style={{ left: `${endPercent}%`, marginLeft: '-6px' }}
          onMouseDown={handleMouseDown('end')}
        />
      </div>
    </div>
  );
});

// DCAChart component
const DCAChart = memo(function DCAChart({
  price,
  dates,
  zScores,
  timeRange,
  onTimeRangeChange,
  dcaWindow,
  DCA_BUDGET,
  softmaxAlpha
}: {
  price: number[];
  dates: string[];
  zScores: number[];
  timeRange: [number, number];
  onTimeRangeChange: (range: [number, number]) => void;
  dcaWindow: number;
  DCA_BUDGET: number;
  softmaxAlpha: number;
}) {
  const [showDaily, setShowDaily] = useState(true); // DEFAULT TO SHOWING DAILY BTC PURCHASES
  const [localSoftmaxAlpha, setLocalSoftmaxAlpha] = useState(softmaxAlpha);
  
  // Use the timeRange to determine which data to show and calculate DCA for
  const [startIdx, endIdx] = timeRange;
  const selectedPrice = price.slice(startIdx, endIdx + 1);
  const selectedZScores = zScores.slice(startIdx, endIdx + 1);
  const selectedDates = dates.slice(startIdx, endIdx + 1);
  
  // Calculate the actual DCA window for this time period
  const actualDcaWindow = selectedPrice.length;
  
  // DCA calculations using the selected time period
  // Regular DCA is independent of temperature, so memoize it
  const regDca = useMemo(() => 
    calculateRegularDCA(selectedPrice, DCA_BUDGET, actualDcaWindow), 
    [selectedPrice, DCA_BUDGET, actualDcaWindow]
  );
  
  // Tuned DCA depends on temperature, so recalculate when temperature changes
  const tunedDca = calculateTunedDCA(selectedPrice, selectedZScores, DCA_BUDGET, actualDcaWindow, softmaxModel, localSoftmaxAlpha);
  
  // Calculate cumulative BTC for the selected time period
  const regCum = useMemo(() => 
    regDca.reduce((arr, v, i) => { arr.push((arr[i-1]||0)+v); return arr; }, [] as number[]),
    [regDca]
  );
  const tunedCum = tunedDca.reduce((arr, v, i) => { arr.push((arr[i-1]||0)+v); return arr; }, [] as number[]);
  
  // Latest values from the selected time period
  const latestIdx = selectedDates.length - 1;
  const latestPrice = selectedPrice[latestIdx];
  const latestReg = regCum[latestIdx];
  const latestTuned = tunedCum[latestIdx];
  
  // Debug: Log some sample values to verify calculations
  console.log('DCA Chart Debug:', {
    samplePrices: selectedPrice.slice(0, 5),
    sampleRegDca: regDca.slice(0, 5),
    sampleTunedDca: tunedDca.slice(0, 5),
    totalRegInvestment: regDca.reduce((sum, btc, i) => sum + (btc * selectedPrice[i]), 0),
    totalTunedInvestment: tunedDca.reduce((sum, btc, i) => sum + (btc * selectedPrice[i]), 0),
    expectedInvestment: DCA_BUDGET * actualDcaWindow
  });
  return (
    <div className="bg-black border border-gray-600 p-4 rounded-lg mb-8 w-full">
      {/* Softmax Parameter Controls */}
      <div className="mb-4 p-3 bg-gray-900 border border-gray-600 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-white font-semibold">Softmax Parameters</h4>
          <button
            onClick={() => setLocalSoftmaxAlpha(softmaxAlpha)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
          >
            Reset
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm text-gray-300 mb-1">
              Temperature (α): {localSoftmaxAlpha.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.1"
              value={localSoftmaxAlpha}
              onChange={(e) => setLocalSoftmaxAlpha(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #10b981 0%, #10b981 ${(localSoftmaxAlpha - 0.1) / 4.9 * 100}%, #374151 ${(localSoftmaxAlpha - 0.1) / 4.9 * 100}%, #374151 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0.1 (Aggressive)</span>
              <span>1.0 (Balanced)</span>
              <span>5.0 (Conservative)</span>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="text-gray-300">Performance</div>
            <div className="text-green-400 font-semibold">
              +{((latestTuned - latestReg) / latestReg * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
      
      {/* Chart Container */}
      <div className="h-[500px] flex flex-col">
        <div className="mb-2 flex justify-between items-center">
          <h3 className="text-white font-semibold">
            DCA Comparison - Daily BTC Purchases (Selected Time Period)
            <span className="text-sm text-gray-400 ml-2">
              {selectedDates[latestIdx]} | Price: ${latestPrice?.toLocaleString()} | Reg BTC: {latestReg?.toFixed(4)} | Tuned BTC: {latestTuned?.toFixed(4)}
            </span>
          </h3>
          <button
            onClick={() => setShowDaily(!showDaily)}
            className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
          >
            {showDaily ? 'Show Cumulative' : 'Show Daily BTC Purchases'}
          </button>
        </div>
      <div className="flex-1 w-full h-full">
        <Plot
          data={[
            {
              x: selectedDates,
              y: selectedPrice,
              type: 'scatter',
              mode: 'lines',
              name: 'Close Price',
              line: { color: '#3b82f6', width: 1 },
              yaxis: 'y',
            },
            {
              x: selectedDates,
              y: showDaily ? regDca : regCum,
              type: 'scatter',
              mode: 'lines',
              name: showDaily ? 'Regular DCA (Daily BTC)' : `Regular DCA (Cumulative BTC: ${latestReg?.toFixed(4)})`,
              line: { color: '#10b981', width: 1.5 },
              yaxis: 'y2',
            },
            {
              x: selectedDates,
              y: showDaily ? tunedDca : tunedCum,
              type: 'scatter',
              mode: 'lines',
              name: showDaily ? 'Tuned DCA (Daily BTC)' : `Tuned DCA (Cumulative BTC: ${latestTuned?.toFixed(4)})`,
              line: { color: '#ef4444', width: 1.5 },
              yaxis: 'y2',
            },
          ]}
          layout={{
            autosize: true,
            width: undefined,
            height: undefined,
            plot_bgcolor: '#000000',
            paper_bgcolor: '#000000',
            font: { color: '#ffffff' },
            xaxis: {
              title: 'Date',
              gridcolor: '#374151',
              color: '#ffffff',
            },
            yaxis: {
              title: 'Close Price',
              type: 'log',
              gridcolor: '#374151',
              color: '#ffffff',
              side: 'left',
            },
            yaxis2: {
              title: showDaily ? 'Daily BTC Purchased' : 'Cumulative BTC',
              type: 'log',
              gridcolor: '#374151',
              color: '#ffffff',
              side: 'right',
              overlaying: 'y',
              showgrid: false,
              tickformat: '.6f', // Show 6 decimal places for BTC
            },
            legend: {
              orientation: 'h',
              x: 0.5,
              y: -0.1,
              xanchor: 'center',
              yanchor: 'top',
            },
            margin: { l: 60, r: 60, t: 20, b: 80 },
          }}
          config={{
            displayModeBar: false,
            staticPlot: false,
            responsive: true,
          }}
          useResizeHandler={true}
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <TimeRangeSlider
        min={0}
        max={dates.length - 1}
        value={timeRange}
        onChange={onTimeRangeChange}
        dates={dates}
      />
      </div>
    </div>
  );
});



export default function ChartsPage() {
  const [data, setData] = useState<MetricData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'paginated'>('paginated');
  const [currentPage, setCurrentPage] = useState(0);
  const [timeRanges, setTimeRanges] = useState<Record<string, [number, number]>>({});
  // DCA chart time range state
  const [dcaTimeRange, setDcaTimeRange] = useState<[number, number] | null>(null);
  
  // Pre-calculate filtered datasets including derived metrics
  const optimizedData = useMemo(() => {
    if (!data) return null;
    
    // Calculate derived metrics
    const derivedMetrics = calculateDerivedMetrics(data.metrics);
    
    // Combine base and derived metrics
    const allMetrics = { ...data.metrics, ...derivedMetrics };
    
    // Create optimized lookup structures
    const result: Record<string, {
      values: number[];
      zScores: number[];
      dates: string[];
    }> = {};
    
    // Process base metrics
    METRICS_LIST.forEach(metric => {
      const values = allMetrics[metric];
      if (values && values.length > 0) {
        result[metric] = {
          values,
          zScores: calculateZScores(values, Z_SCORE_WINDOWS['4yr']),
          dates: data.dates
        };
      }
    });
    
    // Process derived metrics
    DERIVED_METRICS.forEach(({ name }) => {
      const values = allMetrics[name];
      if (values && values.length > 0) {
        result[name] = {
          values,
          zScores: calculateZScores(values, Z_SCORE_WINDOWS['4yr']),
          dates: data.dates
        };
      }
    });
    
    return result;
  }, [data]);
  
  // Performance monitoring
  const { renderCount, fps } = usePerformanceMonitor();
  const memoryUsage = useMemoryMonitor();
  
  // Create combined metrics list: base metrics + derived metrics, with MVRV after close
  const allMetricsList = useMemo(() => {
    const closeIndex = METRICS_LIST.indexOf('close');
    const beforeClose = METRICS_LIST.slice(0, closeIndex + 1);
    const afterClose = METRICS_LIST.slice(closeIndex + 1);
    const derivedMetricNames = DERIVED_METRICS.map(m => m.name);
    
    return [...beforeClose, ...derivedMetricNames, ...afterClose];
  }, []);

  // Pagination settings
  const chartsPerPage = 6;
  const totalPages = Math.ceil(allMetricsList.length / chartsPerPage);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const result = await fetchAllMetrics();
        setData(result);
        setError(null);
        
        // Initialize time ranges for all metrics (base + derived)
        const derivedMetrics = calculateDerivedMetrics(result.metrics);
        const allMetrics = { ...result.metrics, ...derivedMetrics };
        const initialTimeRanges: Record<string, [number, number]> = {};
        
        Object.keys(allMetrics).forEach(metric => {
          initialTimeRanges[metric] = [0, result.dates.length - 1];
        });
        setTimeRanges(initialTimeRanges);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Keyboard shortcuts for pagination
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode === 'paginated' && !e.ctrlKey && !e.metaKey) {
        if (e.key === 'ArrowLeft' && currentPage > 0) {
          setCurrentPage(currentPage - 1);
          e.preventDefault();
        } else if (e.key === 'ArrowRight' && currentPage < totalPages - 1) {
          setCurrentPage(currentPage + 1);
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, currentPage, totalPages]);









  // Real-time update with requestAnimationFrame for smooth performance
  const realtimeUpdateTimeRange = useCallback((metric: string, newRange: [number, number]) => {
    // Use requestAnimationFrame for smooth, real-time updates
    requestAnimationFrame(() => {
      setTimeRanges(prev => ({
        ...prev,
        [metric]: newRange
      }));
    });
  }, []);

  // DCA parameters - use 4-year rolling window for calculations (same as ranking page)
  const dcaWindow = 1460; // 4 years rolling window (same as ranking page)
  const zScoreWindow = Z_SCORE_WINDOWS['4yr']; // 4 years (same as ranking page)
  const DCA_BUDGET = 10; // $10 per day
  const softmaxAlpha = 1.0; // Temperature parameter
  
  // Find close price and z-scores for DCA chart
  const closeMetric = optimizedData?.close;
  const price = closeMetric?.values || [];
  const dates = useMemo(() => closeMetric?.dates || [], [closeMetric?.dates]);
  
  // Find the top-performing metric for tuned DCA (same logic as ranking page)
  const topMetric = useMemo(() => {
    if (!optimizedData) return null;
    
    // Calculate DCA results for all metrics (same as ranking page)
    const results = Object.entries(optimizedData).map(([metric, data]) => {
      const z = data.zScores;
      
      // Fix: Use actual DCA window based on available data
      const actualDcaWindow = Math.min(dcaWindow, price.length);
      
      const regDca = calculateRegularDCA(price, DCA_BUDGET, actualDcaWindow);
      const tunedDca = calculateTunedDCA(price, z, DCA_BUDGET, actualDcaWindow, softmaxModel, softmaxAlpha);
      
      const regBtc = regDca.reduce((a, b) => a + b, 0);
      const tunedBtc = tunedDca.reduce((a, b) => a + b, 0);
      const currentPrice = price[price.length - 1];
      const regUsd = regBtc * currentPrice;
      const tunedUsd = tunedBtc * currentPrice;
      
      const totalInvestment = DCA_BUDGET * actualDcaWindow;
      const profit = totalInvestment > 0 
        ? Math.round(((tunedUsd - totalInvestment) / totalInvestment) * 100)
        : 0;
      
      return { metric, profit, tunedDca, regDca };
    });
    
    // Sort by profit and return the top performer
    results.sort((a, b) => b.profit - a.profit);
    return results[0];
  }, [optimizedData, price, dcaWindow, softmaxAlpha]);
  
  // Use top metric's tuned DCA for the chart
  const zScores = topMetric ? optimizedData?.[topMetric.metric]?.zScores || [] : [];

  // After dates are loaded, set default to last 2 years
  useEffect(() => {
    if (dcaTimeRange === null && dates && dates.length > 0) {
      const total = dates.length;
      const twoYears = 730;
      setDcaTimeRange([Math.max(0, total - twoYears), total - 1]);
    }
  }, [dates, dcaTimeRange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Loading Charts...</h1>
          <div className="text-gray-400">Fetching metric data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Error</h1>
          <div className="text-red-400">{error}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">No Data</h1>
          <div className="text-gray-400">No metric data available</div>
        </div>
      </div>
    );
  }

  // DCA chart time range (default: full range)
  const dcaRange = dcaTimeRange || [0, dates.length - 1];

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header without menu icon */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Data Verification Charts</h1>
        </div>
        <div className="text-gray-400 mb-4">
          Data points: {data.dates.length} | Date range: {data.dates[0]} to {data.dates[data.dates.length - 1]}
        </div>
        
        {/* Performance Dashboard */}
        <div className="mb-8">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setShowPerformancePanel(!showPerformancePanel)}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              {showPerformancePanel ? 'Hide' : 'Show'} Performance Monitor
            </button>
            
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('paginated')}
                className={`px-4 py-2 rounded ${viewMode === 'paginated' ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}
              >
                Paginated (6 charts) - Fast
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 rounded ${viewMode === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}
              >
                All Charts (Slow)
              </button>
            </div>
          </div>
          
          {showPerformancePanel && (
            <div className="bg-gray-900 border border-gray-600 p-4 rounded-lg mb-4">
              <h3 className="text-white font-semibold mb-2">Performance Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">FPS</div>
                  <div className={`text-white ${fps < 30 ? 'text-red-400' : fps < 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {fps}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Render Count</div>
                  <div className="text-white">{renderCount}</div>
                </div>
                <div>
                  <div className="text-gray-400">Charts Displayed</div>
                  <div className="text-white">
                    {viewMode === 'paginated' ? Math.min(chartsPerPage, allMetricsList.length - currentPage * chartsPerPage) : allMetricsList.length}
                    {viewMode === 'paginated' && ` / ${allMetricsList.length}`}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Active Data Points</div>
                  <div className="text-white">
                    {viewMode === 'paginated' 
                      ? data.dates.length * Math.min(chartsPerPage, allMetricsList.length - currentPage * chartsPerPage)
                      : data.dates.length * allMetricsList.length
                    }
                  </div>
                </div>
                {memoryUsage && (
                  <>
                    <div>
                      <div className="text-gray-400">Used JS Heap</div>
                      <div className="text-white">{(memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Total JS Heap</div>
                      <div className="text-white">{(memoryUsage.totalJSHeapSize / 1024 / 1024).toFixed(1)} MB</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Heap Limit</div>
                      <div className="text-white">{(memoryUsage.jsHeapSizeLimit / 1024 / 1024).toFixed(1)} MB</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Memory Usage</div>
                      <div className="text-white">{((memoryUsage.usedJSHeapSize / memoryUsage.jsHeapSizeLimit) * 100).toFixed(1)}%</div>
                    </div>
                                     </>
                 )}
               </div>
                               {(fps < 30 || renderCount > 100) && (
                  <div className="mt-4 p-3 bg-red-900 border border-red-600 rounded">
                    <div className="text-red-200 font-semibold">⚠️ Performance Warning</div>
                    <div className="text-red-300 text-sm mt-1">
                      {fps < 30 && 'Low FPS detected. '}
                      {renderCount > 100 && 'High render count detected. '}
                      Real-time chart updates are active. Consider using paginated mode for best performance.
                    </div>
                  </div>
                )}
             </div>
           )}
         </div>
        
        {/* DCA Chart always first, full width, not in grid */}
        <DCAChart
          price={price}
          dates={dates}
          zScores={zScores}
          timeRange={dcaRange}
          onTimeRangeChange={setDcaTimeRange}
          dcaWindow={dcaWindow}
          DCA_BUDGET={DCA_BUDGET}
          softmaxAlpha={softmaxAlpha}
        />
        {/* Pagination Controls */}
        {viewMode === 'paginated' && (
          <div className="mb-8">
            <div className="flex justify-center items-center gap-4">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-500 text-white px-4 py-2 rounded"
              >
                Previous
              </button>
              <span className="text-white">
                Page {currentPage + 1} of {totalPages} ({chartsPerPage} charts per page)
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage === totalPages - 1}
                className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-500 text-white px-4 py-2 rounded"
              >
                Next
              </button>
            </div>
            <div className="text-center text-sm text-gray-400 mt-2">
              Use ← → arrow keys to navigate pages
            </div>
          </div>
        )}
        
        {/* Chart Container: always show grid of paginated charts below DCA chart */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {(() => {
            // Determine which metrics to render based on view mode
            let metricsToRender = allMetricsList;
            
            if (viewMode === 'paginated') {
              const startIndex = currentPage * chartsPerPage;
              const endIndex = startIndex + chartsPerPage;
              metricsToRender = allMetricsList.slice(startIndex, endIndex);
            }
            
            return metricsToRender.map((metric) => {
              // Special handling for MVRV Ratio composite chart
              if (metric === 'MVRV Ratio') {
                const mvrvData = optimizedData?.['MVRV Ratio'];
                const marketCapData = optimizedData?.['marketcap'];
                const realizedCapData = optimizedData?.['realized-cap'];
                const currentTimeRange = timeRanges[metric] || [0, data.dates.length - 1];
                
                if (!mvrvData || !marketCapData || !realizedCapData) {
                  return (
                    <div key={metric} className="bg-black border border-gray-600 p-4 rounded-lg">
                      <h3 className="text-white font-semibold mb-2">MVRV Ratio (Composite)</h3>
                      <div className="text-red-400">Data not available</div>
                    </div>
                  );
                }
                
                return (
                  <MVRVCompositeChart
                    key={metric}
                    marketCapData={{ values: marketCapData.values, zScores: marketCapData.zScores }}
                    realizedCapData={{ values: realizedCapData.values, zScores: realizedCapData.zScores }}
                    mvrvData={{ values: mvrvData.values, zScores: mvrvData.zScores }}
                    dates={data.dates}
                    timeRange={currentTimeRange}
                    onTimeRangeChange={(newRange) => realtimeUpdateTimeRange(metric, newRange)}
                  />
                );
              }
              
              // Regular chart for all other metrics
              const metricData = optimizedData?.[metric];
              if (!metricData) {
                return (
                  <div key={metric} className="bg-black border border-gray-600 p-4 rounded-lg">
                    <h3 className="text-white font-semibold mb-2">{getMetricDisplayName(metric)}</h3>
                    <div className="text-red-400">No data available</div>
                  </div>
                );
              }

              const currentTimeRange = timeRanges[metric] || [0, metricData.values.length - 1];
              
              return (
                <ChartComponent
                  key={metric}
                  metric={metric}
                  values={metricData.values}
                  zScores={metricData.zScores}
                  dates={metricData.dates}
                  timeRange={currentTimeRange}
                  onTimeRangeChange={(newRange) => realtimeUpdateTimeRange(metric, newRange)}
                />
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
} 