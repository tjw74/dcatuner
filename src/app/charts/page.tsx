'use client';

import { useEffect, useState } from 'react';
import { fetchAllMetrics, type MetricData } from '@/datamanager';
import { METRICS_LIST } from '@/datamanager/metricsConfig';
import { calculateZScores, Z_SCORE_WINDOWS } from '@/datamanager/zScore';
import dynamic from 'next/dynamic';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { 
  ssr: false,
  loading: () => <div className="text-white">Loading chart...</div>
}) as any;

// Custom dual-handle range slider component
function TimeRangeSlider({ 
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
  
  const handleMouseDown = (handle: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(handle);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    const newValue = Math.round(min + percentage * (max - min));
    const clampedValue = Math.max(min, Math.min(max, newValue));
    
    if (isDragging === 'start') {
      onChange([Math.min(clampedValue, value[1]), value[1]]);
    } else {
      onChange([value[0], Math.max(clampedValue, value[0])]);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  const startPercent = ((value[0] - min) / (max - min)) * 100;
  const endPercent = ((value[1] - min) / (max - min)) * 100;

  return (
    <div className="mt-4 mb-2">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{dates[value[0]]}</span>
        <span>{dates[value[1]]}</span>
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
}

export default function ChartsPage() {
  const [data, setData] = useState<MetricData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [timeRanges, setTimeRanges] = useState<Record<string, [number, number]>>({});

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const result = await fetchAllMetrics();
        setData(result);
        setError(null);
        
        // Initialize time ranges
        const initialTimeRanges: Record<string, [number, number]> = {};
        METRICS_LIST.forEach(metric => {
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



  const updateTimeRange = (metric: string, newRange: [number, number]) => {
    setTimeRanges(prev => ({
      ...prev,
      [metric]: newRange
    }));
  };

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
        <div className="text-gray-400 mb-8">
          Data points: {data.dates.length} | Date range: {data.dates[0]} to {data.dates[data.dates.length - 1]}
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {METRICS_LIST.map((metric) => {
            const values = data.metrics[metric];
            if (!values || values.length === 0) {
              return (
                <div key={metric} className="bg-black border border-gray-600 p-4 rounded-lg">
                  <h3 className="text-white font-semibold mb-2">{metric}</h3>
                  <div className="text-red-400">No data available</div>
                </div>
              );
            }

            const currentTimeRange = timeRanges[metric] || [0, values.length - 1];
            
            // Calculate z-scores for the metric (using 4-year window)
            const zScores = calculateZScores(values, Z_SCORE_WINDOWS['4yr']);
            
            // Filter data based on time range
            const filteredDates = data.dates.slice(currentTimeRange[0], currentTimeRange[1] + 1);
            const filteredValues = values.slice(currentTimeRange[0], currentTimeRange[1] + 1);
            const filteredZScores = zScores.slice(currentTimeRange[0], currentTimeRange[1] + 1);
            
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
                  max={data.dates.length - 1}
                  value={currentTimeRange}
                  onChange={(newRange) => updateTimeRange(metric, newRange)}
                  dates={data.dates}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 