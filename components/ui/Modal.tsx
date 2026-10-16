'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
}: ModalProps) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const target = panel.current?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])') || panel.current;
    target?.focus();
    return () => { previousFocus?.focus(); };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      if (e.key === 'Tab' && isOpen && panel.current) {
        const controls = Array.from(panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'))
          .filter(element => element.getClientRects().length > 0);
        const first = controls[0], last = controls[controls.length - 1];
        if (!first) { e.preventDefault(); panel.current.focus(); }
        else if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center p-4">
      {/* Backdrop sutil e escuro */}
      <div
        className="fixed inset-0 bg-[#050706]/80 backdrop-blur-[4px] transition-opacity"
        onClick={onClose}
      />

      {/* Janela modal */}
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex flex-col max-h-[calc(100dvh-2rem)] w-full ${maxWidthClasses[maxWidth]} bg-[#0C1A19] border border-[rgba(218,241,222,0.12)] rounded-2xl shadow-2xl p-6 z-10 animate-in fade-in zoom-in-95 duration-200 overflow-hidden`}
      >
        <div className="flex shrink-0 items-start justify-between pb-4 border-b border-[rgba(218,241,222,0.06)] mb-5">
          <div>
            <h3 id={titleId} className="text-lg font-medium text-[#E7ECE8] font-heading">{title}</h3>
            {subtitle && <p className="text-xs text-[#9BA6A0] mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            type="button"
            aria-label="Fechar janela"
            className="text-[#9BA6A0] hover:text-[#E7ECE8] p-1.5 rounded-lg hover:bg-[#10201E] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}
