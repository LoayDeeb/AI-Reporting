'use client';

import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  headerGradient?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  size = 'lg',
  headerGradient = 'primary'
}) => {
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    full: 'max-w-[90vw]'
  };

  const gradientClasses = {
    primary: 'bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)]',
    success: 'bg-gradient-to-r from-emerald-600 to-teal-600',
    warning: 'bg-gradient-to-r from-amber-600 to-orange-600',
    danger: 'bg-gradient-to-r from-rose-600 to-red-600',
    neutral: 'bg-[var(--surface-elevated)]'
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[var(--surface-overlay)] backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Container */}
      <div 
        className={`
          relative w-full ${sizeClasses[size]} max-h-[90vh] 
          bg-[var(--surface-elevated)] rounded-[var(--radius-xl)] 
          border border-[var(--border-default)]
          shadow-[var(--shadow-lg)] overflow-hidden
          transform transition-all duration-200 ease-out
          animate-in fade-in zoom-in-95
        `}
      >
        {/* Header */}
        <div className={`${gradientClasses[headerGradient]} px-6 py-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {icon && (
                <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-[var(--radius-lg)] border border-white/20">
                  {icon}
                </div>
              )}
              <div>
                <h2 
                  id="modal-title" 
                  className="text-xl font-semibold text-white"
                >
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-white/70 text-sm mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-[var(--radius-md)] transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
