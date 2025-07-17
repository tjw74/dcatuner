'use client';

import { useEffect, useState, useCallback, useMemo, useRef, memo, useDeferredValue } from 'react';
import { fetchAllMetrics, type MetricData } from '@/datamanager';
import { METRICS_LIST, DERIVED_METRICS } from '@/datamanager/metricsConfig';
import { calculateZScores, Z_SCORE_WINDOWS } from '@/datamanager/zScore';
import { calculateDerivedMetrics } from '@/datamanager/derivedMetrics';
import dynamic from 'next/dynamic';



// Simple performance monitoring hook
function usePerformanceMonitor() {
  const [renderCount, setRenderCount] = useState(0);
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
  const [memoryUsage, setMemoryUsage] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if ('memory' in performance) {
        setMemoryUsage((performance as any).memory);
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
            name: `Market Cap`,
            line: { color: '#10b981', width: 1 },
            yaxis: 'y',
          },
          {
            x: filteredDates,
            y: filteredRealizedCap,
            type: 'scatter',
            mode: 'lines',
            name: `Realized Cap`,
            line: { color: '#8b5cf6', width: 1 },
            yaxis: 'y',
          },
          {
            x: filteredDates,
            y: filteredMVRV,
            type: 'scatter',
            mode: 'lines',
            name: `MVRV Ratio (${formattedMVRV})`,
            line: { color: '#3b82f6', width: 1.5 },
            yaxis: 'y2',
          },
          {
            x: filteredDates,
            y: filteredMVRVZScore,
            type: 'scatter',
            mode: 'lines',
            name: `MVRV Z-Score (${formattedMVRVZScore})`,
            line: { color: '#ef4444', width: 1 },
            yaxis: 'y2',
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
  // Memoize filtered data to avoid recalculating on every render
  const filteredData = useMemo(() => {
    const filteredDates = dates.slice(timeRange[0], timeRange[1] + 1);
    const filteredValues = values.slice(timeRange[0], timeRange[1] + 1);
    const filteredZScores = zScores.slice(timeRange[0], timeRange[1] + 1);
    
    // Get latest value and date from filtered data
    const latestIndex = filteredValues.length - 1;
    const latestValue = filteredValues[latestIndex];
    const latestDate = filteredDates[latestIndex];
    const latestZScore = filteredZScores[latestIndex];
    
    // Format the latest value for display
    const formattedValue = typeof latestValue === 'number' ? 
      (latestValue > 1000 ? latestValue.toLocaleString() : latestValue.toFixed(4)) : 
      'N/A';
    
    // Format the latest z-score for display
    const formattedZScore = typeof latestZScore === 'number' && !isNaN(latestZScore) ? 
      latestZScore.toFixed(2) : 
      'N/A';
    
    return {
      filteredDates,
      filteredValues,
      filteredZScores,
      latestValue,
      latestDate,
      latestZScore,
      formattedValue,
      formattedZScore
    };
  }, [dates, values, zScores, timeRange]);
  
  const { 
    filteredDates, 
    filteredValues, 
    filteredZScores, 
    latestValue, 
    latestDate, 
    latestZScore, 
    formattedValue, 
    formattedZScore 
  } = filteredData;

  return (
    <div key={metric} className="bg-black border border-gray-600 p-4 rounded-lg">
      <div className="mb-2">
        <h3 className="text-white font-semibold">
          {metric}
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
            name: `${metric} (Latest: ${formattedValue})`,
            line: { color: '#3b82f6', width: 1 },
            yaxis: 'y',
          },
          {
            x: filteredDates,
            y: filteredZScores,
            type: 'scatter',
            mode: 'lines',
            name: `Z-Score (Latest: ${formattedZScore})`,
            line: { color: '#ef4444', width: 1 },
            yaxis: 'y2',
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
            title: metric,
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

export default function ChartsPage() {
  const [data, setData] = useState<MetricData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'paginated'>('paginated');
  const [currentPage, setCurrentPage] = useState(0);
  const [timeRanges, setTimeRanges] = useState<Record<string, [number, number]>>({});
  
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

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Data Verification Charts</h1>
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
        
                {/* Chart Container */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {(() => {
            // Determine which metrics to render based on view mode
            let metricsToRender = allMetricsList;
            
            if (viewMode === 'paginated') {
              const startIndex = currentPage * chartsPerPage;
              const endIndex = startIndex + chartsPerPage;
              metricsToRender = allMetricsList.slice(startIndex, endIndex);
            }
            
            return metricsToRender.map((metric, index) => {
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
                    <h3 className="text-white font-semibold mb-2">{metric}</h3>
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