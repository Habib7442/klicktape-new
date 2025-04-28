import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import postsReducer from "./slices/postsSlice";
import reelsReducer from "./slices/reelsSlice";
import notificationReducer from "./slices/notificationSlice";
import messageReducer from "./slices/messageSlice";
import userStatusReducer from "./slices/userStatusSlice";
import authReducer from "./slices/authSlice";
import sidebarReducer from "./slices/sidebarSlice";
import commentsReducer from "./slices/commentsSlice";

const postsPersistConfig = {
  key: "posts",
  storage: AsyncStorage,
  whitelist: ["likedPosts", "bookmarkedPosts"],
};

const reelsPersistConfig = {
  key: "reels",
  storage: AsyncStorage,
  whitelist: ["likedReelIds", "likedCommentIds"],
};

const persistedPostsReducer = persistReducer(postsPersistConfig, postsReducer);
const persistedReelsReducer = persistReducer(reelsPersistConfig, reelsReducer);

export const store = configureStore({
  reducer: {
    posts: persistedPostsReducer,
    reels: persistedReelsReducer,
    notifications: notificationReducer,
    messages: messageReducer,
    userStatus: userStatusReducer,
    auth: authReducer,
    sidebar: sidebarReducer,
    comments: commentsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;