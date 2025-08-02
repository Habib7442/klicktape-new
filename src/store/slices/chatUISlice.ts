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

  // Modal state
  isActionsModalVisible: boolean;
  actionsModalMessageId: string | null;

  // Optimistic reactions (for instant UI updates)
  optimisticReactions: Record<string, { emoji: string; timestamp: number }>;

  // Optimistic message deletions (for instant UI updates)
  optimisticDeletedMessages: Set<string>;

  // Animation states
  isMessageHighlighted: boolean;
  highlightedMessageId: string | null;
}

const initialState: ChatUIState = {
  selectedMessageId: null,
  selectedMessagePosition: null,
  isEmojiPickerVisible: false,
  isActionsModalVisible: false,
  actionsModalMessageId: null,
  optimisticReactions: {},
  optimisticDeletedMessages: new Set(),
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

    // Modal actions
    showActionsModal: (state, action: PayloadAction<string>) => {
      state.isActionsModalVisible = true;
      state.actionsModalMessageId = action.payload;
    },

    hideActionsModal: (state) => {
      state.isActionsModalVisible = false;
      state.actionsModalMessageId = null;
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

    // Optimistic message deletion actions
    addOptimisticDeletedMessage: (state, action: PayloadAction<string>) => {
      state.optimisticDeletedMessages.add(action.payload);
    },

    removeOptimisticDeletedMessage: (state, action: PayloadAction<string>) => {
      state.optimisticDeletedMessages.delete(action.payload);
    },

    clearOptimisticDeletedMessages: (state) => {
      state.optimisticDeletedMessages.clear();
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
  showActionsModal,
  hideActionsModal,
  addOptimisticReaction,
  removeOptimisticReaction,
  clearOptimisticReactions,
  addOptimisticDeletedMessage,
  removeOptimisticDeletedMessage,
  clearOptimisticDeletedMessages,
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

export const selectActionsModal = createSelector(
  [selectChatUI],
  (chatUI) => ({
    isVisible: chatUI.isActionsModalVisible,
    messageId: chatUI.actionsModalMessageId,
  })
);

export const selectOptimisticDeletedMessages = createSelector(
  [selectChatUI],
  (chatUI) => chatUI.optimisticDeletedMessages
);

export const selectIsMessageDeleted = (messageId: string) =>
  createSelector(
    [selectChatUI],
    (chatUI) => chatUI.optimisticDeletedMessages.has(messageId)
  );

export default chatUISlice.reducer;
