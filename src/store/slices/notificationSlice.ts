import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface NotificationData {
  id: string;
  recipient_id: string;
  sender_id: string;
  type: 'like' | 'comment' | 'follow' | 'mention';
  post_id?: string;
  reel_id?: string;
  comment_id?: string;
  message?: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    username: string;
    avatar_url?: string;
  };
}

interface NotificationState {
  unreadCount: number;
  notifications: NotificationData[];
}

const initialState: NotificationState = {
  unreadCount: 0,
  notifications: [],
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    incrementUnreadCount: (state) => {
      state.unreadCount += 1;
    },
    resetUnreadCount: (state) => {
      state.unreadCount = 0;
    },
    setNotifications: (state, action: PayloadAction<NotificationData[]>) => {
      state.notifications = action.payload;
      // Update unread count based on notifications
      state.unreadCount = action.payload.filter(n => !n.is_read).length;
    },
    addNotification: (state, action: PayloadAction<NotificationData>) => {
      // Add new notification to the beginning of the array
      state.notifications.unshift(action.payload);
      // Increment unread count if notification is unread
      if (!action.payload.is_read) {
        state.unreadCount += 1;
      }
    },
    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.is_read) {
        notification.is_read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    updateNotification: (state, action: PayloadAction<Partial<NotificationData> & { id: string }>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload.id);
      if (index !== -1) {
        const wasUnread = !state.notifications[index].is_read;
        state.notifications[index] = { ...state.notifications[index], ...action.payload };

        // Update unread count if read status changed
        const isNowRead = state.notifications[index].is_read;
        if (wasUnread && isNowRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        } else if (!wasUnread && !isNowRead) {
          state.unreadCount += 1;
        }
      }
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload);
      if (index !== -1) {
        const wasUnread = !state.notifications[index].is_read;
        state.notifications.splice(index, 1);

        // Decrease unread count if the removed notification was unread
        if (wasUnread) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      }
    },
  },
});

export const {
  setUnreadCount,
  incrementUnreadCount,
  resetUnreadCount,
  setNotifications,
  addNotification,
  markNotificationAsRead,
  updateNotification,
  removeNotification
} = notificationSlice.actions;
export default notificationSlice.reducer;