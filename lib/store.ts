import { create } from 'zustand';
interface UI {
  search: boolean;
  sidebar: boolean;
  toast: string;
  setSearch: (value: boolean) => void;
  setSidebar: (value: boolean) => void;
  notify: (value: string) => void;
}
let timeout: ReturnType<typeof setTimeout>;
export const useUI = create<UI>((set) => ({
  search: false,
  sidebar: false,
  toast: '',
  setSearch: (search) => set({ search }),
  setSidebar: (sidebar) => set({ sidebar }),
  notify: (toast) => {
    clearTimeout(timeout);
    set({ toast });
    timeout = setTimeout(() => set({ toast: '' }), 4500);
  },
}));
export function report(error: unknown) {
  useUI
    .getState()
    .notify(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
}
