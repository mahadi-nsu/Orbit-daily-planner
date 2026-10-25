import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { setTheme } from '@/lib/theme';
beforeEach(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = 'light';
});
describe('workspace theme', () => {
  it('starts light, switches both ways, and persists the selected theme', () => {
    render(<ThemeSwitcher />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('orbit.theme')).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light theme' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('orbit.theme')).toBe('light');
  });
  it('reflects theme changes from another browser tab', () => {
    render(<ThemeSwitcher />);
    act(() =>
      window.dispatchEvent(new StorageEvent('storage', { key: 'orbit.theme', newValue: 'dark' })),
    );
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
    act(() => setTheme('light'));
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument();
  });
});
