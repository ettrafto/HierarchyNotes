// Window theme utilities - style tokens for glass, card, and slate variants

import type { WindowStyle } from './types';

export function getFrameClasses(style: WindowStyle): string {
  switch (style) {
    case 'glass':
      return [
        // Container with frosted glass effect
        'rounded-2xl shadow-xl',
        'bg-white/8 backdrop-blur-md',
        'border border-white/10',
        // Subtle interactive affordances
        'transition-colors',
        'hover:bg-white/10',
      ].join(' ');
    case 'card':
      return [
        'rounded-2xl shadow-lg',
        'bg-neutral-900',
        'border border-neutral-800',
      ].join(' ');
    case 'slate':
      return [
        'rounded-xl shadow',
        'bg-neutral-950',
        'border border-neutral-900',
      ].join(' ');
  }
}

export function getTitlebarClasses(style: WindowStyle): string {
  switch (style) {
    case 'glass':
      return 'h-8 px-3 flex items-center gap-2 text-neutral-100/90';
    case 'card':
      return 'h-8 px-3 flex items-center gap-2 text-neutral-100';
    case 'slate':
      return 'h-7 px-3 flex items-center gap-2 text-neutral-200';
  }
}

export function getGripClasses(style: WindowStyle): string {
  // Small drag handle visual
  switch (style) {
    case 'glass':
      return 'w-10 h-3 rounded-full bg-white/30';
    case 'card':
      return 'w-10 h-3 rounded-full bg-neutral-700';
    case 'slate':
      return 'w-8 h-2 rounded bg-neutral-800';
  }
}

export function getContentClasses(style: WindowStyle): string {
  // Content area styling
  switch (style) {
    case 'glass':
      return 'flex-1 overflow-auto bg-transparent';
    case 'card':
      return 'flex-1 overflow-auto bg-neutral-950/50';
    case 'slate':
      return 'flex-1 overflow-auto bg-black/20';
  }
}

export function getCloseButtonClasses(style: WindowStyle): string {
  switch (style) {
    case 'glass':
      return 'h-6 w-6 grid place-items-center rounded-md hover:bg-white/10 transition-colors';
    case 'card':
      return 'h-6 w-6 grid place-items-center rounded-md hover:bg-neutral-800 transition-colors';
    case 'slate':
      return 'h-6 w-6 grid place-items-center rounded-md hover:bg-neutral-900 transition-colors';
  }
}

