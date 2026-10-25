'use client';

export type Theme = 'light' | 'dark';
const themeEvent = 'orbit:theme';
export const themeStorageKey = 'orbit.theme';

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    // Theme switching still works when browser storage is unavailable.
  }
  window.dispatchEvent(new Event(themeEvent));
}

export function subscribeTheme(listener: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== themeStorageKey && event.key !== null) return;
    document.documentElement.dataset.theme = event.newValue === 'dark' ? 'dark' : 'light';
    listener();
  };
  window.addEventListener(themeEvent, listener);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(themeEvent, listener);
    window.removeEventListener('storage', handleStorage);
  };
}

export function serverTheme(): Theme {
  return 'light';
}
