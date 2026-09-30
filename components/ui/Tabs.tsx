'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ items, activeId, onChange, className }: TabsProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1 p-1 rounded-xl bg-[#07100F] border border-[rgba(218,241,222,0.06)]',
          className
        )
      )}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={clsx(
              'px-3.5 py-1.5 rounded-lg text-xs font-heading transition-all duration-200 flex items-center gap-2',
              isActive
                ? 'bg-[#10201E] text-[#E7ECE8] border border-[rgba(218,241,222,0.12)] font-medium shadow-sm'
                : 'text-[#9BA6A0] hover:text-[#E7ECE8] hover:bg-[#10201E]/40'
            )}
          >
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span
                className={clsx(
                  'px-1.5 py-0.2 text-[10px] rounded font-mono',
                  isActive
                    ? 'bg-[#F1F9A1]/15 text-[#F1F9A1]'
                    : 'bg-[#163832] text-[#9BA6A0]'
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
