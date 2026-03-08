import { create } from 'zustand';

type UiState = {
  stashKeyword: string;
  stashSourceFilter: string;
  stashTitleFilter: string;
  activeConversationId?: string;
  setActiveConversationId: (conversationId?: string) => void;
  setFilters: (filters: Partial<Pick<UiState, 'stashKeyword' | 'stashSourceFilter' | 'stashTitleFilter'>>) => void;
};

export const useUiStore = create<UiState>((set) => ({
  stashKeyword: '',
  stashSourceFilter: '',
  stashTitleFilter: '',
  activeConversationId: undefined,
  setActiveConversationId: (activeConversationId) => set({ activeConversationId }),
  setFilters: (filters) => set(filters),
}));
