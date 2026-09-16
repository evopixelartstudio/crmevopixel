'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-[#0C1A19]/50 border border-[rgba(218,241,222,0.06)] border-dashed">
      <div className="w-12 h-12 rounded-xl bg-[#10201E] border border-[rgba(218,241,222,0.08)] flex items-center justify-center text-[#8EB69B] mb-4">
        <Icon className="w-5 h-5" />
      </div>
      <h4 className="text-base font-medium text-[#E7ECE8] font-heading mb-1">{title}</h4>
      <p className="text-xs text-[#9BA6A0] max-w-sm leading-relaxed mb-5">{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
