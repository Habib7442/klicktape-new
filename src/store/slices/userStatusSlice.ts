import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserStatusState {
  isActive: boolean;
}

const initialState: UserStatusState = {
  isActive: false,
};

const userStatusSlice = createSlice({
  name: 'userStatus',
  initialState,
  reducers: {
    setActiveStatus: (state, action: PayloadAction<boolean>) => {
      state.isActive = action.payload;
    },
  },
});

export const { setActiveStatus } = userStatusSlice.actions;
export default userStatusSlice.reducer;