/**
 * Storage Bucket Verification and Creation Script
 * This script verifies that all required storage buckets exist and creates them if they don't
 */

import { supabase } from '../lib/supabase';

interface BucketConfig {
  id: string;
  name: string;
  public: boolean;
  fileSizeLimit: number;
  allowedMimeTypes: string[];
}

const REQUIRED_BUCKETS: BucketConfig[] = [
  {
    id: 'avatars',
    name: 'avatars',
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  {
    id: 'posts',
    name: 'posts',
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  {
    id: 'stories',
    name: 'stories',
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  {
    id: 'reels',
    name: 'reels',
    public: true,
    fileSizeLimit: 104857600, // 100MB
    allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
  },
  {
    id: 'thumbnails',
    name: 'thumbnails',
    public: true,
    fileSizeLimit: 2097152, // 2MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  }
];

export async function verifyAndCreateBuckets(): Promise<void> {
  console.log('🔍 Verifying storage buckets...');

  try {
    // Get existing buckets
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      throw listError;
    }

    const existingBucketIds = existingBuckets?.map(bucket => bucket.id) || [];
    console.log('📦 Existing buckets:', existingBucketIds);

    // Check each required bucket
    for (const bucketConfig of REQUIRED_BUCKETS) {
      if (existingBucketIds.includes(bucketConfig.id)) {
        console.log(`✅ Bucket '${bucketConfig.id}' exists`);
      } else {
        console.log(`⚠️  Bucket '${bucketConfig.id}' missing, creating...`);
        
        const { error: createError } = await supabase.storage.createBucket(bucketConfig.id, {
          public: bucketConfig.public,
          fileSizeLimit: bucketConfig.fileSizeLimit,
          allowedMimeTypes: bucketConfig.allowedMimeTypes
        });

        if (createError) {
          console.error(`❌ Error creating bucket '${bucketConfig.id}':`, createError);
          throw createError;
        } else {
          console.log(`✅ Created bucket '${bucketConfig.id}'`);
        }
      }
    }

    console.log('🎉 All storage buckets verified successfully!');
  } catch (error) {
    console.error('💥 Storage bucket verification failed:', error);
    throw error;
  }
}

export async function testBucketAccess(): Promise<void> {
  console.log('🧪 Testing bucket access...');

  try {
    // Test each bucket by trying to list files
    for (const bucket of REQUIRED_BUCKETS) {
      const { data, error } = await supabase.storage.from(bucket.id).list('', {
        limit: 1
      });

      if (error) {
        console.error(`❌ Error accessing bucket '${bucket.id}':`, error);
        throw error;
      } else {
        console.log(`✅ Bucket '${bucket.id}' is accessible`);
      }
    }

    console.log('🎉 All buckets are accessible!');
  } catch (error) {
    console.error('💥 Bucket access test failed:', error);
    throw error;
  }
}

// Run verification if this script is executed directly
if (require.main === module) {
  (async () => {
    try {
      await verifyAndCreateBuckets();
      await testBucketAccess();
      console.log('🚀 Storage setup complete!');
    } catch (error) {
      console.error('💥 Storage setup failed:', error);
      process.exit(1);
    }
  })();
}
