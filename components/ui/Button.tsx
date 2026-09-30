'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  children: React.ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-heading font-medium transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-[#F1F9A1]/30 disabled:opacity-40 disabled:cursor-not-allowed select-none';

  const variants = {
    primary:
      'bg-[#F1F9A1] text-[#07100F] hover:bg-[#e4ec91] active:bg-[#d8e085] shadow-[0_0_15px_rgba(241,249,161,0.15)] font-semibold',
    secondary:
      'bg-[#10201E] text-[#E7ECE8] border border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.18)] hover:bg-[#163832]/50 active:bg-[#163832]',
    outline:
      'bg-transparent text-[#E7ECE8] border border-[rgba(218,241,222,0.12)] hover:border-[rgba(218,241,222,0.22)] hover:bg-[#0C1A19]',
    ghost:
      'bg-transparent text-[#9BA6A0] hover:text-[#E7ECE8] hover:bg-[#10201E]/60 active:bg-[#10201E]',
    destructive:
      'bg-[#2d1417] text-[#fca5a5] border border-[#ef4444]/20 hover:bg-[#3d1a1e] hover:border-[#ef4444]/40',
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
    md: 'h-9 px-4 text-sm rounded-xl gap-2',
    lg: 'h-11 px-5 text-base rounded-xl gap-2.5',
    icon: 'h-9 w-9 p-0 rounded-xl',
  };

  return (
    <button
      className={twMerge(clsx(baseClasses, variants[variant], sizes[size], className))}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
