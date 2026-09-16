'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 'lg',
}: DrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    md: 'max-w-md',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#050706]/75 backdrop-blur-[3px] transition-opacity"
        onClick={onClose}
      />

      {/* Painel lateral direito */}
      <div
        className={`relative w-full ${widthClasses[width]} h-full bg-[#0C1A19] border-l border-[rgba(218,241,222,0.1)] shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250`}
      >
        <div className="flex items-start justify-between p-6 border-b border-[rgba(218,241,222,0.06)] bg-[#07100F]/60">
          <div>
            <h3 className="text-lg font-medium text-[#E7ECE8] font-heading">{title}</h3>
            {subtitle && <p className="text-xs text-[#9BA6A0] mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-[#9BA6A0] hover:text-[#E7ECE8] p-1.5 rounded-lg hover:bg-[#10201E] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">{children}</div>
      </div>
    </div>
  );
}
