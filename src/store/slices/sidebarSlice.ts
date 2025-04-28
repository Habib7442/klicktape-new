import { createSlice } from '@reduxjs/toolkit';

const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState: {
    isVisible: false,
  },
  reducers: {
    openSidebar: (state) => {
      state.isVisible = true;
    },
    closeSidebar: (state) => {
      state.isVisible = false;
    },
    toggleSidebar: (state) => {
      state.isVisible = !state.isVisible;
    },
  },
});

export const { openSidebar, closeSidebar, toggleSidebar } = sidebarSlice.actions;
export default sidebarSlice.reducer;