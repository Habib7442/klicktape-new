import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';

interface MessagePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ChatUIState {
  // Message selection for reactions
  selectedMessageId: string | null;
  selectedMessagePosition: MessagePosition | null;
  isEmojiPickerVisible: boolean;
  
  // Optimistic reactions (for instant UI updates)
  optimisticReactions: Record<string, { emoji: string; timestamp: number }>;
  
  // Animation states
  isMessageHighlighted: boolean;
  highlightedMessageId: string | null;
}

const initialState: ChatUIState = {
  selectedMessageId: null,
  selectedMessagePosition: null,
  isEmojiPickerVisible: false,
  optimisticReactions: {},
  isMessageHighlighted: false,
  highlightedMessageId: null,
};

const chatUISlice = createSlice({
  name: 'chatUI',
  initialState,
  reducers: {
    // Message selection actions
    selectMessageForReaction: (
      state, 
      action: PayloadAction<{ messageId: string; position: MessagePosition }>
    ) => {
      state.selectedMessageId = action.payload.messageId;
      state.selectedMessagePosition = action.payload.position;
      state.isEmojiPickerVisible = true;
      state.isMessageHighlighted = true;
      state.highlightedMessageId = action.payload.messageId;
    },
    
    clearMessageSelection: (state) => {
      state.selectedMessageId = null;
      state.selectedMessagePosition = null;
      state.isEmojiPickerVisible = false;
      state.isMessageHighlighted = false;
      state.highlightedMessageId = null;
    },
    
    hideEmojiPicker: (state) => {
      state.isEmojiPickerVisible = false;
      state.isMessageHighlighted = false;
      state.highlightedMessageId = null;
    },
    
    // Optimistic reaction actions
    addOptimisticReaction: (
      state, 
      action: PayloadAction<{ messageId: string; emoji: string }>
    ) => {
      const { messageId, emoji } = action.payload;
      state.optimisticReactions[messageId] = {
        emoji,
        timestamp: Date.now(),
      };
    },
    
    removeOptimisticReaction: (state, action: PayloadAction<string>) => {
      delete state.optimisticReactions[action.payload];
    },
    
    clearOptimisticReactions: (state) => {
      state.optimisticReactions = {};
    },
    
    // Highlight actions
    highlightMessage: (state, action: PayloadAction<string>) => {
      state.isMessageHighlighted = true;
      state.highlightedMessageId = action.payload;
    },
    
    clearHighlight: (state) => {
      state.isMessageHighlighted = false;
      state.highlightedMessageId = null;
    },
  },
});

export const {
  selectMessageForReaction,
  clearMessageSelection,
  hideEmojiPicker,
  addOptimisticReaction,
  removeOptimisticReaction,
  clearOptimisticReactions,
  highlightMessage,
  clearHighlight,
} = chatUISlice.actions;

// Base selector
export const selectChatUI = (state: { chatUI: ChatUIState }) => state.chatUI;

// Memoized selectors to prevent unnecessary re-renders
export const selectSelectedMessage = createSelector(
  [selectChatUI],
  (chatUI) => ({
    messageId: chatUI.selectedMessageId,
    position: chatUI.selectedMessagePosition,
    isVisible: chatUI.isEmojiPickerVisible,
  })
);

export const selectMessageHighlight = createSelector(
  [selectChatUI],
  (chatUI) => ({
    isHighlighted: chatUI.isMessageHighlighted,
    messageId: chatUI.highlightedMessageId,
  })
);

export const selectOptimisticReaction = (messageId: string) =>
  createSelector(
    [selectChatUI],
    (chatUI) => chatUI.optimisticReactions[messageId]
  );

export default chatUISlice.reducer;
