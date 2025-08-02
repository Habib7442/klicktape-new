import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { communityPostsAPI } from '@/lib/communitiesApi';
import { communityMediaUpload } from '@/lib/communityMediaUpload';
import * as ImagePicker from 'expo-image-picker';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  communityId: string;
  communityName: string;
  onPostCreated?: () => void;
}

export default function CreatePostModal({
  visible,
  onClose,
  communityId,
  communityName,
  onPostCreated,
}: CreatePostModalProps) {
  const { colors, isDarkMode } = useTheme();
  const [content, setContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [linkUrl, setLinkUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);

  const handleCreatePost = async () => {
    if (!content.trim() && selectedImages.length === 0 && !selectedVideo.trim() && !linkUrl.trim()) {
      Alert.alert('Error', 'Please add some content to your post');
      return;
    }

    try {
      setLoading(true);

      // Upload media if any
      let uploadedImageUrls: string[] = [];
      let uploadedVideoUrl: string | undefined;

      if (selectedImages.length > 0) {
        console.log('Uploading images...');
        const imageFiles = selectedImages.map(uri => communityMediaUpload.getFileInfo(uri));

        // Validate files
        for (const file of imageFiles) {
          const validation = communityMediaUpload.validateFile(file, 10); // 10MB limit
          if (!validation.isValid) {
            Alert.alert('Error', validation.error || 'Invalid file');
            return;
          }
        }

        const uploadResults = await communityMediaUpload.uploadMultipleImages(imageFiles);
        uploadedImageUrls = uploadResults.map(result => result.publicUrl);
        console.log('Images uploaded successfully:', uploadedImageUrls);
      }

      if (!!selectedVideo) {
        console.log('Uploading video...');
        const videoFile = communityMediaUpload.getFileInfo(selectedVideo);

        // Validate video file
        const validation = communityMediaUpload.validateFile(videoFile, 100); // 100MB limit for videos
        if (!validation.isValid) {
          Alert.alert('Error', validation.error || 'Invalid video file');
          return;
        }

        const uploadResult = await communityMediaUpload.uploadVideo(videoFile);
        uploadedVideoUrl = uploadResult.publicUrl;
        console.log('Video uploaded successfully:', uploadedVideoUrl);
      }

      // Extract hashtags from content
      const hashtags = content.match(/#\w+/g)?.map(tag => tag.slice(1)) || [];

      // Extract tagged users from content
      const taggedUsers = content.match(/@\w+/g)?.map(tag => tag.slice(1)) || [];

      await communityPostsAPI.createCommunityPost(
        communityId,
        content.trim() || undefined,
        uploadedImageUrls,
        uploadedVideoUrl,
        linkUrl.trim() || undefined,
        hashtags,
        taggedUsers
      );

      Alert.alert('Success', 'Post created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            handleClose();
            onPostCreated?.();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error creating post:', error);
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setContent('');
    setSelectedImages([]);
    setSelectedVideo('');
    setLinkUrl('');
    setShowLinkInput(false);
    onClose();
  };

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [16, 9],
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setSelectedImages(prev => [...prev, ...newImages].slice(0, 4)); // Max 4 images
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload videos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 300, // 5 minutes max
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedVideo(result.assets[0].uri);
        // Clear images when video is selected (posts can have either images OR video, not both)
        setSelectedImages([]);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
    setSelectedVideo('');
  };

  const canPost = content.trim() || selectedImages.length > 0 || selectedVideo.trim() || linkUrl.trim();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={[styles.header, {
          borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        }]}>
          <TouchableOpacity onPress={handleClose}>
            <Feather name="x" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Create Post
          </Text>
          <TouchableOpacity
            onPress={handleCreatePost}
            disabled={loading || !canPost}
            style={[styles.postButton, {
              backgroundColor: (!canPost || loading)
                ? (isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)')
                : (isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)'),
              borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)',
            }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={[styles.postButtonText, { 
                color: (!canPost || loading) ? colors.textTertiary : colors.text 
              }]}>
                Post
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Community Info */}
          <View style={styles.communityInfo}>
            <Feather name="users" size={20} color={colors.primary} />
            <Text style={[styles.communityName, { color: colors.text }]}>
              Posting in {communityName}
            </Text>
          </View>

          {/* Content Input */}
          <TextInput
            style={[styles.contentInput, { 
              color: colors.text,
              backgroundColor: colors.input,
              borderColor: colors.inputBorder,
            }]}
            placeholder="What's happening in this community?"
            placeholderTextColor={colors.textTertiary}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            maxLength={2000}
            editable={!loading}
          />

          {/* Character Count */}
          <Text style={[styles.characterCount, { 
            color: content.length > 1800 ? '#dc3545' : colors.textSecondary 
          }]}>
            {content.length}/2000
          </Text>

          {/* Selected Images */}
          {selectedImages.length > 0 && (
            <View style={styles.imagesContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Images ({selectedImages.length}/4)
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.imagesRow}>
                  {selectedImages.map((uri, index) => (
                    <View key={index} style={styles.imageContainer}>
                      <Image source={{ uri }} style={styles.selectedImage} />
                      <TouchableOpacity
                        onPress={() => removeImage(index)}
                        style={styles.removeImageButton}
                      >
                        <Feather name="x" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Selected Video */}
          {!!selectedVideo && (
            <View style={styles.videoContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Video
              </Text>
              <View style={styles.videoPreview}>
                <View style={[styles.videoPlaceholder, {
                  backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
                  borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)',
                }]}>
                  <Feather name="play-circle" size={40} color={colors.textSecondary} />
                  <Text style={[styles.videoText, { color: colors.textSecondary }]}>
                    Video selected
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={removeVideo}
                  style={styles.removeVideoButton}
                >
                  <Feather name="x" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Link Input */}
          {showLinkInput && (
            <View style={styles.linkContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Link
              </Text>
              <TextInput
                style={[styles.linkInput, { 
                  color: colors.text,
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                }]}
                placeholder="https://example.com"
                placeholderTextColor={colors.textTertiary}
                value={linkUrl}
                onChangeText={setLinkUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!loading}
              />
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              onPress={pickImages}
              disabled={loading || selectedImages.length >= 4 || !!selectedVideo}
              style={[styles.actionButton, {
                backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
                borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)',
                opacity: (selectedImages.length >= 4 || !!selectedVideo) ? 0.5 : 1,
              }]}
            >
              <Feather name="image" size={20} color={colors.text} />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>
                Add Images
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={pickVideo}
              disabled={loading || !!selectedVideo || selectedImages.length > 0}
              style={[styles.actionButton, {
                backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
                borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)',
                opacity: (!!selectedVideo || selectedImages.length > 0) ? 0.5 : 1,
              }]}
            >
              <Feather name="video" size={20} color={colors.text} />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>
                Add Video
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowLinkInput(!showLinkInput)}
              disabled={loading}
              style={[styles.actionButton, {
                backgroundColor: showLinkInput
                  ? (isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)')
                  : (isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)'),
                borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(128, 128, 128, 0.2)',
              }]}
            >
              <Feather name="link" size={20} color={colors.text} />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>
                Add Link
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tips */}
          <View style={[styles.tipsContainer, {
            backgroundColor: isDarkMode ? 'rgba(128, 128, 128, 0.1)' : 'rgba(128, 128, 128, 0.05)',
            borderColor: isDarkMode ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
          }]}>
            <Feather name="info" size={16} color={colors.textSecondary} />
            <View style={styles.tipsContent}>
              <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
                Use #hashtags to categorize your post and @username to mention other users. You can add up to 4 images or 1 video (max 5 minutes).
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Rubik-Bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  postButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  postButtonText: {
    fontSize: 14,
    fontFamily: 'Rubik-Bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  communityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  communityName: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
  },
  contentInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    minHeight: 120,
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Rubik-Bold',
    marginBottom: 12,
  },
  imagesContainer: {
    marginBottom: 16,
  },
  imagesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  imageContainer: {
    position: 'relative',
  },
  selectedImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoContainer: {
    marginBottom: 16,
  },
  videoPreview: {
    position: 'relative',
  },
  videoPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  videoText: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
  },
  removeVideoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkContainer: {
    marginBottom: 16,
  },
  linkInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 20,
  },
  tipsContent: {
    flex: 1,
  },
  tipsText: {
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
    lineHeight: 16,
  },
});
