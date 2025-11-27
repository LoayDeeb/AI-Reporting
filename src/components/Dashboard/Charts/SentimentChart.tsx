import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Heart } from 'lucide-react';

interface SentimentData {
  positive: number;
  negative: number;
  neutral: number;
}

interface SentimentChartProps {
  data?: SentimentData;
}

const SentimentChart = ({ data }: SentimentChartProps) => {
  // Only show chart if we have real data
  if (!data) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 group">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20 mr-3">
            <Heart className="text-rose-400 h-6 w-6" />
          </div>
          <h3 className="text-xl font-semibold text-white">
            Sentiment Distribution
          </h3>
        </div>
        <div className="h-[300px] flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-lg font-medium">No Data Available</p>
            <p className="text-sm mt-2">Run an analysis to see sentiment distribution</p>
          </div>
        </div>
      </div>
    );
  }

  const chartData = [
    {
      name: 'Positive',
      value: data.positive,
      color: '#22D3EE',
    },
    {
      name: 'Neutral',
      value: data.neutral,
      color: '#818CF8',
    },
    {
      name: 'Negative',
      value: data.negative,
      color: '#FB7185',
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-gray-800/90 backdrop-blur-md border border-gray-700/50 rounded-xl p-4 shadow-xl">
          <p className="text-white font-medium">{data.name}</p>
          <p className="text-gray-300">
            <span className="font-bold" style={{ color: data.payload.color }}>
              {data.value}%
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return percent > 0.05 ? (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-sm font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 group">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20 mr-3 group-hover:scale-110 transition-transform duration-300">
          <Heart className="text-rose-400 h-6 w-6" />
        </div>
        <h3 className="text-xl font-semibold text-white group-hover:text-gray-100 transition-colors duration-300">
          Sentiment Distribution
        </h3>
      </div>

      {/* Chart */}
      <div className="h-[300px] relative">
        {/* Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-cyan-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {Math.round(chartData.reduce((sum, item) => sum + item.value, 0))}%
            </p>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center space-x-6 mt-4">
        {chartData.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-sm text-gray-300">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SentimentChart; 