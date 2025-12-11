import { create } from "zustand";

interface AppState {
  // Sleep state
  isSleeping: boolean;
  setSleeping: (sleeping: boolean) => void;

  // Webcam state
  isWebcamOn: boolean;
  setWebcamOn: (on: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Sleep state
  isSleeping: false,
  setSleeping: (sleeping) => set({ isSleeping: sleeping }),

  // Webcam state
  isWebcamOn: false,
  setWebcamOn: (on) => set({ isWebcamOn: on }),
}));
