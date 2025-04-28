import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface MessageState {
  unreadCount: number;
}

const initialState: MessageState = {
  unreadCount: 0,
};

const messageSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setUnreadMessageCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    resetUnreadMessageCount: (state) => {
      state.unreadCount = 0;
    },
    incrementUnreadMessageCount: (state) => {
      state.unreadCount += 1;
    },
  },
});

export const {
  setUnreadMessageCount,
  resetUnreadMessageCount,
  incrementUnreadMessageCount,
} = messageSlice.actions;

export default messageSlice.reducer;