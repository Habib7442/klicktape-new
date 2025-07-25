import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  caption?: string;
  created_at: string;
  expires_at: string;
  viewed_by: string[];
  user: {
    username: string;
    avatar: string;
  };
}

interface GroupedStory {
  user_id: string;
  user: {
    username: string;
    avatar: string;
  };
  stories: Story[];
  hasUnviewed: boolean;
  latestStory: Story;
}

interface StoriesState {
  // Stories data
  stories: Story[];
  loading: boolean;
  error: string | null;
  
  // Modal states
  storySelectionModalVisible: boolean;
  groupedStoryToDelete: GroupedStory | null;
  isDeleteModalVisible: boolean;
  storyToDelete: string | null;
  
  // Story viewer state
  isViewerVisible: boolean;
  viewerStories: Story[];
  viewerStartIndex: number;
  
  // Story creation state
  isPreviewModalVisible: boolean;
  isLoadingModalVisible: boolean;
  croppedImage: string | null;
}

const initialState: StoriesState = {
  // Stories data
  stories: [],
  loading: false,
  error: null,
  
  // Modal states
  storySelectionModalVisible: false,
  groupedStoryToDelete: null,
  isDeleteModalVisible: false,
  storyToDelete: null,
  
  // Story viewer state
  isViewerVisible: false,
  viewerStories: [],
  viewerStartIndex: 0,
  
  // Story creation state
  isPreviewModalVisible: false,
  isLoadingModalVisible: false,
  croppedImage: null,
};

const storiesSlice = createSlice({
  name: 'stories',
  initialState,
  reducers: {
    // Stories data actions
    setStories: (state, action: PayloadAction<Story[]>) => {
      state.stories = action.payload;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Story selection modal actions
    showStorySelectionModal: (state, action: PayloadAction<GroupedStory>) => {
      state.storySelectionModalVisible = true;
      state.groupedStoryToDelete = action.payload;
    },
    hideStorySelectionModal: (state) => {
      state.storySelectionModalVisible = false;
      state.groupedStoryToDelete = null;
    },
    
    // Delete modal actions
    showDeleteModal: (state, action: PayloadAction<string>) => {
      state.isDeleteModalVisible = true;
      state.storyToDelete = action.payload;
    },
    hideDeleteModal: (state) => {
      state.isDeleteModalVisible = false;
      state.storyToDelete = null;
    },
    
    // Story viewer actions
    showStoryViewer: (state, action: PayloadAction<{ stories: Story[]; startIndex: number }>) => {
      state.isViewerVisible = true;
      state.viewerStories = action.payload.stories;
      state.viewerStartIndex = action.payload.startIndex;
    },
    hideStoryViewer: (state) => {
      state.isViewerVisible = false;
      state.viewerStories = [];
      state.viewerStartIndex = 0;
    },
    
    // Story creation actions
    showPreviewModal: (state, action: PayloadAction<string>) => {
      state.isPreviewModalVisible = true;
      state.croppedImage = action.payload;
    },
    hidePreviewModal: (state) => {
      state.isPreviewModalVisible = false;
      // Don't clear croppedImage here - let it persist until story is posted or new image is selected
    },
    showLoadingModal: (state) => {
      state.isLoadingModalVisible = true;
    },
    hideLoadingModal: (state) => {
      state.isLoadingModalVisible = false;
    },
    setCroppedImage: (state, action: PayloadAction<string | null>) => {
      state.croppedImage = action.payload;
    },
    clearCroppedImage: (state) => {
      state.croppedImage = null;
      state.isPreviewModalVisible = false;
    },
    
    // Remove story from state after deletion
    removeStory: (state, action: PayloadAction<string>) => {
      state.stories = state.stories.filter(story => story.id !== action.payload);
    },
  },
});

export const {
  // Stories data actions
  setStories,
  setLoading,
  setError,
  
  // Story selection modal actions
  showStorySelectionModal,
  hideStorySelectionModal,
  
  // Delete modal actions
  showDeleteModal,
  hideDeleteModal,
  
  // Story viewer actions
  showStoryViewer,
  hideStoryViewer,
  
  // Story creation actions
  showPreviewModal,
  hidePreviewModal,
  showLoadingModal,
  hideLoadingModal,
  setCroppedImage,
  clearCroppedImage,

  // Remove story action
  removeStory,
} = storiesSlice.actions;

export default storiesSlice.reducer;
