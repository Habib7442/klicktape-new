-- =====================================================
-- KLICKTAPE STORAGE BUCKETS SETUP
-- Complete storage configuration for Klicktape app
-- =====================================================

-- =====================================================
-- STORAGE BUCKETS CREATION
-- =====================================================

-- Create storage buckets for different media types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  -- Avatars bucket (5MB limit)
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  
  -- Posts bucket (10MB limit)
  ('posts', 'posts', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  
  -- Stories bucket (10MB limit)
  ('stories', 'stories', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  
  -- Reels/Tapes bucket (100MB limit)
  ('reels', 'reels', true, 104857600, ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']),
  
  -- Thumbnails bucket (2MB limit)
  ('thumbnails', 'thumbnails', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES FOR AVATARS BUCKET
-- =====================================================

-- Allow public read access to avatar images
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================
-- STORAGE POLICIES FOR POSTS BUCKET
-- =====================================================

-- Allow public read access to post images
CREATE POLICY "Post images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'posts');

-- Allow authenticated users to upload post images
CREATE POLICY "Users can upload post images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'posts' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own post images
CREATE POLICY "Users can delete their own post images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'posts' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================
-- STORAGE POLICIES FOR STORIES BUCKET
-- =====================================================

-- Allow public read access to story images
CREATE POLICY "Story images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'stories');

-- Allow authenticated users to upload story images
CREATE POLICY "Users can upload story images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'stories' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own story images
CREATE POLICY "Users can delete their own story images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'stories' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================
-- STORAGE POLICIES FOR REELS/TAPES BUCKET
-- =====================================================

-- Allow public read access to reel videos
CREATE POLICY "Reel videos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'reels');

-- Allow authenticated users to upload reel videos
CREATE POLICY "Users can upload reel videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reels' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own reel videos
CREATE POLICY "Users can delete their own reel videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'reels' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================
-- STORAGE POLICIES FOR THUMBNAILS BUCKET
-- =====================================================

-- Allow public read access to thumbnail images
CREATE POLICY "Thumbnail images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'thumbnails');

-- Allow authenticated users to upload thumbnail images
CREATE POLICY "Users can upload thumbnail images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'thumbnails' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own thumbnail images
CREATE POLICY "Users can delete their own thumbnail images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'thumbnails' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify buckets were created
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('avatars', 'posts', 'stories', 'reels', 'thumbnails');

-- Verify policies were created
SELECT policyname, tablename, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- =====================================================
-- STORAGE BUCKET SUMMARY
-- =====================================================

/*
CREATED BUCKETS:
1. avatars - User profile pictures (5MB, images only)
2. posts - Post images (10MB, images only)  
3. stories - Story images (10MB, images only)
4. reels - Video content/tapes (100MB, videos only)
5. thumbnails - Video thumbnails (2MB, images only)

SECURITY:
- All buckets are publicly readable
- Users can only upload/delete their own files
- Files are organized by user ID folders
- Proper MIME type restrictions
- File size limits enforced

FOLDER STRUCTURE:
- avatars/{user_id}/avatar.jpg
- posts/{user_id}/post_123.jpg
- stories/{user_id}/story_456.jpg
- reels/{user_id}/reel_789.mp4
- thumbnails/{user_id}/thumb_789.jpg
*/
