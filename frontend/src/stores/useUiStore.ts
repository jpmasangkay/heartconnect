import { create } from 'zustand';

export interface ConfirmDialogOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'default';
  onConfirm: () => Promise<void> | void;
}

interface UiStoreState {
  // Command Palette State
  isCommandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;

  // Destructive Confirmation Dialog State
  confirmDialog: ConfirmDialogOptions | null;
  isConfirmDialogOpen: boolean;
  openConfirmDialog: (options: ConfirmDialogOptions) => void;
  closeConfirmDialog: () => void;

  // Transient UI Drawers & Filters
  isFilterDrawerOpen: boolean;
  setFilterDrawerOpen: (open: boolean) => void;
  toggleFilterDrawer: () => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  // Command Palette
  isCommandPaletteOpen: false,
  openCommandPalette: () => set({ isCommandPaletteOpen: true }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

  // Confirm Dialog
  confirmDialog: null,
  isConfirmDialogOpen: false,
  openConfirmDialog: (options) => set({ confirmDialog: options, isConfirmDialogOpen: true }),
  closeConfirmDialog: () => set({ confirmDialog: null, isConfirmDialogOpen: false }),

  // Filter Drawer
  isFilterDrawerOpen: false,
  setFilterDrawerOpen: (open) => set({ isFilterDrawerOpen: open }),
  toggleFilterDrawer: () => set((state) => ({ isFilterDrawerOpen: !state.isFilterDrawerOpen })),
}));
