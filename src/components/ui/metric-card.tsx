'use client';

import React, { ReactNode } from 'react';

type MetricVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface MetricCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  variant?: MetricVariant;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles: Record<MetricVariant, { bg: string; border: string; text: string; glow: string }> = {
  primary: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20 hover:border-blue-500/40',
    text: 'text-blue-400',
    glow: 'group-hover:shadow-blue-500/10'
  },
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20 hover:border-emerald-500/40',
    text: 'text-emerald-400',
    glow: 'group-hover:shadow-emerald-500/10'
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20 hover:border-amber-500/40',
    text: 'text-amber-400',
    glow: 'group-hover:shadow-amber-500/10'
  },
  danger: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20 hover:border-rose-500/40',
    text: 'text-rose-400',
    glow: 'group-hover:shadow-rose-500/10'
  },
  info: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20 hover:border-cyan-500/40',
    text: 'text-cyan-400',
    glow: 'group-hover:shadow-cyan-500/10'
  },
  neutral: {
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20 hover:border-slate-500/40',
    text: 'text-slate-400',
    glow: 'group-hover:shadow-slate-500/10'
  }
};

const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  title,
  value,
  variant = 'primary',
  subtitle,
  trend,
  size = 'md'
}) => {
  const styles = variantStyles[variant];
  
  const sizeStyles = {
    sm: { padding: 'p-4', iconSize: 'p-2', valueSize: 'text-2xl', titleSize: 'text-xs' },
    md: { padding: 'p-6', iconSize: 'p-3', valueSize: 'text-3xl', titleSize: 'text-sm' },
    lg: { padding: 'p-8', iconSize: 'p-4', valueSize: 'text-4xl', titleSize: 'text-base' }
  };
  
  const sizing = sizeStyles[size];

  return (
    <div 
      className={`
        relative overflow-hidden group
        bg-[var(--surface-card)] backdrop-blur-sm 
        rounded-[var(--radius-xl)] ${sizing.padding}
        border ${styles.border}
        transition-all duration-300 
        hover:shadow-lg ${styles.glow}
      `}
    >
      {/* Subtle gradient overlay on hover */}
      <div 
        className={`
          absolute inset-0 ${styles.bg} 
          opacity-0 group-hover:opacity-100 
          transition-opacity duration-300 pointer-events-none
        `} 
      />
      
      <div className="relative z-10">
        {/* Icon */}
        <div 
          className={`
            inline-flex items-center justify-center 
            ${sizing.iconSize} rounded-[var(--radius-lg)] 
            ${styles.bg} border ${styles.border.split(' ')[0]}
            mb-4 transition-transform duration-300 
            group-hover:scale-105
          `}
        >
          <div className={styles.text}>{icon}</div>
        </div>
        
        {/* Content */}
        <div className="space-y-1.5">
          <h3 
            className={`
              ${sizing.titleSize} font-medium 
              text-[var(--text-muted)] 
              group-hover:text-[var(--text-secondary)] 
              transition-colors duration-300
            `}
          >
            {title}
          </h3>
          
          <div className="flex items-end justify-between gap-2">
            <p 
              className={`
                ${sizing.valueSize} font-bold ${styles.text}
                transition-transform duration-300
              `}
            >
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            
            {trend && (
              <div 
                className={`
                  flex items-center gap-1 text-xs font-medium
                  ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}
                `}
              >
                <span>{trend.isPositive ? '↗' : '↘'}</span>
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
          
          {subtitle && (
            <p 
              className="text-xs text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors duration-300"
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
