'use client';

import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = 'info',
  size = 'md',
  showLabel = false,
  label,
  animated = false,
  className = ''
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3'
  };

  const variantClasses = {
    success: 'bg-[var(--color-success)]',
    warning: 'bg-[var(--color-warning)]',
    danger: 'bg-[var(--color-danger)]',
    info: 'bg-[var(--color-info)]',
    neutral: 'bg-slate-400',
    gradient: 'bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)]'
  };

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && (
            <span className="text-sm text-[var(--text-secondary)]">{label}</span>
          )}
          {showLabel && (
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div 
        className={`
          w-full ${sizeClasses[size]} 
          bg-slate-700/50 rounded-full overflow-hidden
        `}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`
            ${sizeClasses[size]} ${variantClasses[variant]} 
            rounded-full transition-all duration-500 ease-out
            ${animated ? 'animate-pulse' : ''}
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

interface ProgressBarGroupProps {
  items: Array<{
    label: string;
    value: number;
    variant?: ProgressBarProps['variant'];
    icon?: React.ReactNode;
  }>;
  max?: number;
  size?: ProgressBarProps['size'];
}

export const ProgressBarGroup: React.FC<ProgressBarGroupProps> = ({
  items,
  max = 100,
  size = 'md'
}) => {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-4">
          {item.icon && (
            <div className="flex-shrink-0 w-5 h-5 text-[var(--text-muted)]">
              {item.icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-[var(--text-secondary)] truncate">
                {item.label}
              </span>
              <span className="text-sm font-semibold text-[var(--text-primary)] ml-2">
                {item.value}
              </span>
            </div>
            <ProgressBar 
              value={item.value} 
              max={max} 
              variant={item.variant || 'info'} 
              size={size}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProgressBar;
