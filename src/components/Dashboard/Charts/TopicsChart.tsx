import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Target } from 'lucide-react';

interface TopicData {
  topic: string;
  count: number;
}

interface TopicsChartProps {
  data?: TopicData[];
}

const TopicsChart = ({ data }: TopicsChartProps) => {
  // Only show chart if we have real data
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 group">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20 mr-3">
            <Target className="text-cyan-400 h-6 w-6" />
          </div>
          <h3 className="text-xl font-semibold text-white">
            Top User Topics
          </h3>
        </div>
        <div className="h-[300px] flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-4">🎯</div>
            <p className="text-lg font-medium">No Data Available</p>
            <p className="text-sm mt-2">Run an analysis to see user topics</p>
          </div>
        </div>
      </div>
    );
  }

  // Convert data format
  const formattedData = data.map(item => ({
    name: item.topic,
    value: item.count,
    fullName: item.topic.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
  }));

  const colors = ['#22D3EE', '#818CF8', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-gray-800/90 backdrop-blur-md border border-gray-700/50 rounded-xl p-4 shadow-xl">
          <p className="text-white font-medium">{data.payload.fullName}</p>
          <p className="text-gray-300">
            Count: <span className="font-bold text-cyan-400">{data.value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomBar = (props: any) => {
    const { fill, ...rest } = props;
    return (
      <Bar 
        {...rest} 
        fill={fill}
        radius={[4, 4, 0, 0]}
        className="transition-all duration-300 hover:opacity-80"
      />
    );
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 group">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20 mr-3 group-hover:scale-110 transition-transform duration-300">
          <Target className="text-cyan-400 h-6 w-6" />
        </div>
        <h3 className="text-xl font-semibold text-white group-hover:text-gray-100 transition-colors duration-300">
          Top User Topics
        </h3>
      </div>

      {/* Chart */}
      <div className="h-[300px] relative">
        {/* Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={formattedData}
            margin={{
              top: 5,
              right: 20,
              left: 0,
              bottom: 25,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#374151"
              vertical={false}
              opacity={0.3}
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: '#9CA3AF',
                fontSize: 12,
              }}
              height={60}
              angle={-45}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fill: '#9CA3AF',
                fontSize: 12,
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {formattedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={colors[index % colors.length]}
                  className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

              {/* Stats Summary */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-cyan-400">
              {formattedData.length}
            </p>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total Topics</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">
              {Math.max(...formattedData.map(d => d.value))}
            </p>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Highest Count</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">
              {Math.round(formattedData.reduce((sum, d) => sum + d.value, 0) / formattedData.length)}
            </p>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Average</p>
          </div>
        </div>
    </div>
  );
};

export default TopicsChart; 