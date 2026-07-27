// 대시보드에서 현재 선택된 현장 code. TopBar 칩·사이드바·지도·차트가 이 값을 함께 구독한다.
import { create } from "zustand";

interface SiteSelectionState {
  selectedSiteCode: string | null;
  setSelectedSiteCode: (code: string) => void;
}

export const useSiteSelectionStore = create<SiteSelectionState>((set) => ({
  selectedSiteCode: null,
  setSelectedSiteCode: (code) => set({ selectedSiteCode: code }),
}));
