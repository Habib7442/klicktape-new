import { logout } from '../slices/authSlice';
import { clearPosts } from '../slices/postsSlice';
import { AppDispatch } from '../store';

// Action to handle user logout and clear all relevant state
export const logoutUser = () => async (dispatch: AppDispatch) => {
  // Clear posts state
  dispatch(clearPosts());
  
  // Finally, log the user out
  dispatch(logout());
};
