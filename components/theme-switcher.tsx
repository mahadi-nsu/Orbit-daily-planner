'use client';

import { useSyncExternalStore } from 'react';
import { Sun, Moon } from 'lucide-react';
import { currentTheme, serverTheme, setTheme, subscribeTheme } from '@/lib/theme';

export function ThemeSwitcher() {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, serverTheme);
  const label = theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
  return (
    <button
      type="button"
      className="theme-switcher"
      aria-label={label}
      title={label}
      aria-pressed={theme === 'dark'}
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      {theme === 'light' ? <Sun size={17} /> : <Moon size={17} />}
      <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
    </button>
  );
}
