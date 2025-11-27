import React, { ReactNode } from 'react';

interface MetricCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  color: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const MetricCard = ({ icon, title, value, color, subtitle, trend }: MetricCardProps) => {
  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: { bg: string; border: string; text: string; hover: string } } = {
      cyan: {
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/20',
        text: 'text-cyan-400',
        hover: 'hover:border-cyan-500/50'
      },
      emerald: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        text: 'text-emerald-400',
        hover: 'hover:border-emerald-500/50'
      },
      amber: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        text: 'text-amber-400',
        hover: 'hover:border-amber-500/50'
      },
      fuchsia: {
        bg: 'bg-fuchsia-500/10',
        border: 'border-fuchsia-500/20',
        text: 'text-fuchsia-400',
        hover: 'hover:border-fuchsia-500/50'
      },
      rose: {
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20',
        text: 'text-rose-400',
        hover: 'hover:border-rose-500/50'
      },
      violet: {
        bg: 'bg-violet-500/10',
        border: 'border-violet-500/20',
        text: 'text-violet-400',
        hover: 'hover:border-violet-500/50'
      },
      blue: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        text: 'text-blue-400',
        hover: 'hover:border-blue-500/50'
      }
    };
    
    return colorMap[color] || colorMap.blue;
  };

  const colorClasses = getColorClasses(color);

  return (
    <div className={`relative overflow-hidden bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 ${colorClasses.hover} transition-all duration-300 group hover:shadow-lg hover:shadow-${color}-500/10`}>
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
      
      {/* Floating Orb */}
      <div className={`absolute -top-4 -right-4 w-16 h-16 ${colorClasses.bg} rounded-full blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500`}></div>
      
      <div className="relative z-10">
        {/* Icon */}
        <div className={`inline-flex items-center justify-center p-3 rounded-xl ${colorClasses.bg} ${colorClasses.border} border mb-4 group-hover:scale-110 transition-transform duration-300`}>
          <div className={colorClasses.text}>
            {icon}
          </div>
        </div>
        
        {/* Content */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
            {title}
          </h3>
          <div className="flex items-end justify-between">
            <p className={`text-3xl font-bold ${colorClasses.text} group-hover:scale-105 transition-transform duration-300`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {trend && (
              <div className={`flex items-center space-x-1 text-xs ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                <span>{trend.isPositive ? '↗' : '↘'}</span>
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors duration-300">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricCard; 