'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'deep' | 'secondary';
  glow?: boolean;
}

export function Card({
  variant = 'surface',
  glow = false,
  className,
  children,
  ...props
}: CardProps) {
  const variants = {
    surface: 'bg-[#0C1A19] border-[rgba(218,241,222,0.08)] hover:border-[rgba(218,241,222,0.16)]',
    deep: 'bg-[#07100F] border-[rgba(218,241,222,0.06)] hover:border-[rgba(218,241,222,0.12)]',
    secondary: 'bg-[#10201E] border-[rgba(218,241,222,0.09)] hover:border-[rgba(218,241,222,0.18)]',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'rounded-2xl border p-5 transition-all duration-200 shadow-[0_4px_20px_-2px_rgba(5,7,6,0.5)]',
          variants[variant],
          glow && 'relative overflow-hidden before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top,_rgba(142,182,155,0.04),transparent_70%)] before:pointer-events-none',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={twMerge(clsx('flex items-center justify-between pb-4 border-b border-[rgba(218,241,222,0.06)] mb-4', className))} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={twMerge(clsx('text-base font-medium text-[#E7ECE8] tracking-tight font-heading', className))} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={twMerge(clsx('text-xs text-[#9BA6A0] font-normal leading-relaxed', className))} {...props}>
      {children}
    </p>
  );
}
