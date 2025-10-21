// Theme management for dark/light mode

export type Theme = 'dark' | 'light';

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  
  const stored = localStorage.getItem('theme') as Theme | null;
  if (stored) return stored;
  
  // Default to dark
  return 'dark';
}

export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('theme', theme);
  
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function toggleTheme(): Theme {
  const current = getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function initializeTheme(): void {
  const theme = getTheme();
  setTheme(theme);
}

